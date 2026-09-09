import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthMeResponse } from '@baza/shared-types';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getSupabase } from './supabase-client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionSignal = signal<Session | null>(null);
  private readonly meSignal = signal<AuthMeResponse | null>(null);
  private initialized = false;

  readonly session = this.sessionSignal.asReadonly();
  readonly user = computed(() => this.sessionSignal()?.user ?? null);
  readonly email = computed(() => this.user()?.email ?? null);
  readonly company = computed(() => this.meSignal()?.company ?? null);
  readonly companyName = computed(() => this.company()?.name ?? null);
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
        }
      });
    } catch {
      this.sessionSignal.set(null);
      this.meSignal.set(null);
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
    } catch {
      this.meSignal.set(null);
    }
  }

  currentUser(): User | null {
    return this.user();
  }
}
