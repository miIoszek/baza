import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { AuthMeResponse } from '@baza/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

const meWithCompany: AuthMeResponse = {
  user: { id: 'u1', email: 'a@b.co' },
  company: {
    id: 'c1',
    name: 'Acme',
    nip: '1234567890',
    description: 'd',
    baseLocation: 'PL',
    baseLat: 52,
    baseLng: 21,
    photoUrls: null,
  },
};

const meNoCompany: AuthMeResponse = {
  user: { id: 'u1', email: 'a@b.co' },
  company: null,
};

const session = (token = 'access-1', expiresInSeconds = 300) => ({
  accessToken: token,
  expiresInSeconds,
});

let auth: AuthService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
  });
  auth = TestBed.inject(AuthService);
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => {
  http.verify();
  vi.useRealTimers();
});

/** Signs in through the real code path so the service holds a token. */
async function signedIn(token = 'access-1'): Promise<void> {
  const p = auth.signIn('a@b.co', 'a long password');
  http.expectOne('/api/auth/login').flush(session(token));
  await vi.waitFor(() => http.expectOne('/api/auth/me').flush(meWithCompany));
  await p;
}

describe('AuthService.refreshMe', () => {
  it('sets me on success including company: null', async () => {
    const p = auth.refreshMe();
    http.expectOne('/api/auth/me').flush(meNoCompany);
    await p;
    expect(auth.company()).toBeNull();
    expect(auth.meLoadError()).toBeNull();
  });

  it('does not clear prior me on 500; sets meLoadError', async () => {
    const ok = auth.refreshMe();
    http.expectOne('/api/auth/me').flush(meWithCompany);
    await ok;
    expect(auth.company()?.name).toBe('Acme');

    const fail = auth.refreshMe();
    http.expectOne('/api/auth/me').flush('err', { status: 500, statusText: 'ERR' });
    await fail;

    expect(auth.company()?.name).toBe('Acme');
    expect(auth.meLoadError()).toContain('500');
  });

  it('clears me and the session on 401 without meLoadError', async () => {
    await signedIn();
    expect(auth.isLoggedIn()).toBe(true);

    const fail = auth.refreshMe();
    http.expectOne('/api/auth/me').flush('unauth', { status: 401, statusText: 'Unauthorized' });
    await fail;

    expect(auth.company()).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.meLoadError()).toBeNull();
  });

  it('keeps prior me on unexpected 4xx and sets meLoadError', async () => {
    const ok = auth.refreshMe();
    http.expectOne('/api/auth/me').flush(meWithCompany);
    await ok;

    const fail = auth.refreshMe();
    http.expectOne('/api/auth/me').flush('nope', { status: 403, statusText: 'Forbidden' });
    await fail;

    expect(auth.company()?.name).toBe('Acme');
    expect(auth.meLoadError()).toContain('403');
  });
});

describe('AuthService.signIn / signOut', () => {
  it('logs in with credentials, keeps the token in memory and loads the profile', async () => {
    await signedIn();
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.currentAccessToken()).toBe('access-1');
    expect(auth.accountLabel()).toBe('Acme');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('sends the login request with credentials so the refresh cookie can be set', async () => {
    const p = auth.signIn('a@b.co', 'x'.repeat(12));
    const req = http.expectOne('/api/auth/login');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ email: 'a@b.co', password: 'x'.repeat(12) });
    req.flush({ statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Nieprawidłowy email lub hasło' }, { status: 401, statusText: 'Unauthorized' });
    const result = await p;
    expect(result).toEqual({ error: 'Nieprawidłowy email lub hasło', code: 'INVALID_CREDENTIALS' });
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('reports a network failure without throwing', async () => {
    const p = auth.signIn('a@b.co', 'x'.repeat(12));
    http.expectOne('/api/auth/login').error(new ProgressEvent('error'), { status: 0 });
    expect((await p).error).toContain('połączenia');
  });

  it('signOut clears the local session even when the server call fails', async () => {
    await signedIn();
    const p = auth.signOut();
    http.expectOne('/api/auth/logout').flush('boom', { status: 500, statusText: 'ERR' });
    await p;
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.company()).toBeNull();
  });
});

describe('AuthService session restore and refresh', () => {
  it('restores the session from the refresh cookie on init and then loads the profile', async () => {
    const ready = auth.whenReady();
    const refresh = http.expectOne('/api/auth/refresh');
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush(session('restored'));
    await vi.waitFor(() => http.expectOne('/api/auth/me').flush(meWithCompany));
    await ready;
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.currentAccessToken()).toBe('restored');
  });

  it('stays logged out when there is no valid refresh cookie', async () => {
    const ready = auth.whenReady();
    http.expectOne('/api/auth/refresh').flush({ code: 'SESSION_EXPIRED' }, { status: 401, statusText: 'Unauthorized' });
    await ready;
    expect(auth.isLoggedIn()).toBe(false);
    http.expectNone('/api/auth/me');
  });

  it('initialises only once', async () => {
    const first = auth.whenReady();
    const second = auth.whenReady();
    http.expectOne('/api/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
    await Promise.all([first, second]);
  });

  it('shares ONE refresh request between concurrent callers (single-flight)', async () => {
    await signedIn();
    const a = auth.refreshSession();
    const b = auth.refreshSession();
    const c = auth.getAccessToken();
    http.expectOne('/api/auth/refresh').flush(session('rotated'));
    expect(await Promise.all([a, b])).toEqual([true, true]);
    expect(await c).toBe('access-1');
    expect(auth.currentAccessToken()).toBe('rotated');
  });

  it('refreshes before use when the token is about to expire', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await signedIn();
    vi.setSystemTime(Date.now() + 295_000);
    expect(auth.currentAccessToken()).toBeNull();
    const p = auth.getAccessToken();
    http.expectOne('/api/auth/refresh').flush(session('fresh'));
    expect(await p).toBe('fresh');
  });

  it('does not call the server for a visitor who never logged in', async () => {
    expect(await auth.getAccessToken()).toBeNull();
    http.expectNone('/api/auth/refresh');
  });

  it('a 401 on refresh ends the session; a network error keeps it', async () => {
    await signedIn();
    const net = auth.refreshSession();
    http.expectOne('/api/auth/refresh').error(new ProgressEvent('error'), { status: 0 });
    expect(await net).toBe(false);
    expect(auth.isLoggedIn()).toBe(true);

    const dead = auth.refreshSession();
    http.expectOne('/api/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await dead).toBe(false);
    expect(auth.isLoggedIn()).toBe(false);
  });
});
