import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthMeResponse } from '@baza/shared-types';
import * as Sentry from '@sentry/angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getSupabase } from './supabase-client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionSignal = signal<Session | null>(null);
  private readonly meSignal = signal<AuthMeResponse | null>(null);
  private readonly meLoadErrorSignal = signal<string | null>(null);
  private initialized = false;

  readonly session = this.sessionSignal.asReadonly();
  readonly user = computed(() => this.sessionSignal()?.user ?? null);
  readonly email = computed(() => this.user()?.email ?? null);
  readonly company = computed(() => this.meSignal()?.company ?? null);
  readonly companyName = computed(() => this.company()?.name ?? null);
  /** Set when `/auth/me` fails unexpectedly — not the same as `company === null`. */
  readonly meLoadError = this.meLoadErrorSignal.asReadonly();
  readonly accountLabel = computed(
    () => this.companyName() ?? this.email()
  );
  /** Prefer small logo variant for navbar. */
  readonly accountAvatarUrl = computed(() => {
    const urls = this.meSignal()?.company?.photoUrls;
    if (!urls) {
      return null;
    }
    return urls['s96'] ?? urls['s48'] ?? urls['original'] ?? null;
  });
  readonly isLoggedIn = computed(() => !!this.sessionSignal());

  /** Resolves after Supabase session hydration (safe to call from route guards). */
  whenReady(): Promise<void> {
    return this.init();
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    try {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      this.sessionSignal.set(data.session);
      if (data.session) {
        await this.refreshMe();
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        this.sessionSignal.set(session);
        if (session) {
          void this.refreshMe();
        } else {
          this.meSignal.set(null);
          this.meLoadErrorSignal.set(null);
        }
      });
    } catch {
      this.sessionSignal.set(null);
      this.meSignal.set(null);
      this.meLoadErrorSignal.set(null);
    }
  }

  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      await this.refreshMe();
    }
    return { error: error?.message ?? null };
  }

  async signOut(): Promise<void> {
    await getSupabase().auth.signOut();
    this.sessionSignal.set(null);
    this.meSignal.set(null);
    this.meLoadErrorSignal.set(null);
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const { data } = await getSupabase().auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
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
        this.sessionSignal.set(null);
        this.meSignal.set(null);
        this.meLoadErrorSignal.set(null);
        return;
      }

      // Keep prior me — failed request ≠ successful “no company”.
      const status =
        err instanceof HttpErrorResponse ? err.status : undefined;
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
        Sentry.captureException(err);
      }
    }
  }

  currentUser(): User | null {
    return this.user();
  }
}
