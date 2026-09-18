import { Injectable, computed, inject, signal } from '@angular/core';
import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import type { AuthMeResponse, AuthSessionResponse } from '@baza/shared-types';
import { captureException } from '@sentry/angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/** Refresh this long before the access token expires, so requests rarely meet a stale token. */
const REFRESH_LEAD_MS = 60_000;
/** A token this close to expiry is treated as expired when attaching it. */
const EXPIRY_SKEW_MS = 10_000;

export type SignInResult = { error: string | null; code?: string };

type AccessToken = { value: string; expiresAt: number };

/**
 * Session state. The short-lived access token lives ONLY in memory (never localStorage: an XSS
 * cannot read what is not there). The long-lived refresh token is an HttpOnly cookie the browser
 * manages; the SPA cannot see it and simply calls `/auth/refresh`, which is also how the session
 * is restored after a page reload.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  /** Bypasses interceptors: used for login/refresh/logout to avoid recursion. */
  private readonly rawHttp = new HttpClient(inject(HttpBackend));

  private readonly tokenSignal = signal<AccessToken | null>(null);
  private readonly meSignal = signal<AuthMeResponse | null>(null);
  private readonly meLoadErrorSignal = signal<string | null>(null);
  private initPromise: Promise<void> | null = null;
  private refreshInFlight: Promise<boolean> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly email = computed(() => this.meSignal()?.user.email ?? null);
  readonly company = computed(() => this.meSignal()?.company ?? null);
  readonly companyName = computed(() => this.company()?.name ?? null);
  /** Set when `/auth/me` fails unexpectedly — not the same as `company === null`. */
  readonly meLoadError = this.meLoadErrorSignal.asReadonly();
  readonly accountLabel = computed(() => this.companyName() ?? this.email());
  /** Prefer small logo variant for navbar. */
  readonly accountAvatarUrl = computed(() => {
    const urls = this.meSignal()?.company?.photoUrls;
    if (!urls) {
      return null;
    }
    return urls['s96'] ?? urls['s48'] ?? urls['original'] ?? null;
  });
  readonly isLoggedIn = computed(() => !!this.tokenSignal());

  /** Resolves once the session has been restored (or found absent). Safe from route guards. */
  whenReady(): Promise<void> {
    return this.init();
  }

  init(): Promise<void> {
    this.initPromise ??= this.hydrate();
    return this.initPromise;
  }

  private async hydrate(): Promise<void> {
    try {
      if (await this.refreshSession()) {
        await this.refreshMe();
      }
    } catch {
      this.clearSession();
    }
  }

  async signIn(email: string, password: string): Promise<SignInResult> {
    try {
      const session = await firstValueFrom(
        this.rawHttp.post<AuthSessionResponse>(
          `${environment.apiBaseUrl}/api/auth/login`,
          { email, password },
          { withCredentials: true }
        )
      );
      this.setToken(session);
    } catch (err: unknown) {
      return this.toSignInError(err);
    }
    await this.refreshMe();
    return { error: null };
  }

  async signOut(): Promise<void> {
    try {
      await firstValueFrom(
        this.rawHttp.post<void>(
          `${environment.apiBaseUrl}/api/auth/logout`,
          {},
          { withCredentials: true }
        )
      );
    } catch {
      // Logout must always end the local session, even if the server is unreachable.
    }
    this.clearSession();
  }

  /** The current token if it is still fresh, without any network call. */
  currentAccessToken(): string | null {
    const token = this.tokenSignal();
    return token && token.expiresAt - Date.now() > EXPIRY_SKEW_MS
      ? token.value
      : null;
  }

  /** Whether a session exists at all (possibly with a stale token that can be refreshed). */
  hasSession(): boolean {
    return this.tokenSignal() !== null;
  }

  /**
   * A fresh access token, refreshing first when the current one is (about to be) stale. Returns
   * null when there is no session. Concurrent callers share ONE refresh request.
   */
  async getAccessToken(): Promise<string | null> {
    const fresh = this.currentAccessToken();
    if (fresh) {
      return fresh;
    }
    if (!this.hasSession()) {
      return null;
    }
    return (await this.refreshSession()) ? this.currentAccessToken() : null;
  }

  /**
   * Exchanges the refresh cookie for a new access token. Single-flight: parallel callers (route
   * guards, interceptors, the proactive timer) await the same request, so the server sees one
   * rotation instead of a race.
   */
  refreshSession(): Promise<boolean> {
    this.refreshInFlight ??= this.doRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async doRefresh(): Promise<boolean> {
    try {
      const session = await firstValueFrom(
        this.rawHttp.post<AuthSessionResponse>(
          `${environment.apiBaseUrl}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )
      );
      this.setToken(session);
      return true;
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        // The session is really gone (expired, revoked, or none): sign out locally.
        this.clearSession();
      }
      // Network / 5xx: keep local state; a later call will retry.
      return false;
    }
  }

  async refreshMe(): Promise<void> {
    try {
      const me = await firstValueFrom(
        this.http.get<AuthMeResponse>(`${environment.apiBaseUrl}/api/auth/me`)
      );
      this.meSignal.set(me);
      this.meLoadErrorSignal.set(null);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        this.clearSession();
        return;
      }

      // Keep prior me — failed request ≠ successful “no company”.
      const status = err instanceof HttpErrorResponse ? err.status : undefined;
      this.meLoadErrorSignal.set(
        status === 0 || status === undefined
          ? 'Nie udało się wczytać profilu (błąd sieci)'
          : `Nie udało się wczytać profilu (HTTP ${status})`
      );

      // Interceptor already reports 5xx / network (status 0); capture the rest here.
      const interceptorOwns =
        err instanceof HttpErrorResponse &&
        (err.status === 0 || err.status >= 500);
      if (!interceptorOwns) {
        captureException(err);
      }
    }
  }

  private setToken(session: AuthSessionResponse): void {
    this.tokenSignal.set({
      value: session.accessToken,
      expiresAt: Date.now() + session.expiresInSeconds * 1000,
    });
    this.scheduleRefresh(session.expiresInSeconds * 1000);
  }

  private scheduleRefresh(ttlMs: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    const delay = Math.max(ttlMs - REFRESH_LEAD_MS, 5_000);
    this.refreshTimer = setTimeout(() => {
      if (this.hasSession()) {
        void this.refreshSession();
      }
    }, delay);
  }

  private clearSession(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.tokenSignal.set(null);
    this.meSignal.set(null);
    this.meLoadErrorSignal.set(null);
  }

  private toSignInError(err: unknown): SignInResult {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string | string[]; code?: string } | null;
      const message = Array.isArray(body?.message)
        ? body?.message.join(', ')
        : body?.message;
      if (err.status === 0) {
        return { error: 'Brak połączenia z serwerem. Spróbuj ponownie.' };
      }
      return {
        error: message || 'Nie udało się zalogować',
        code: body?.code,
      };
    }
    return { error: 'Nie udało się zalogować' };
  }
}
