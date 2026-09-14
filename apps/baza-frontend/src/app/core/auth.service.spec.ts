import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import type { AuthMeResponse } from '@baza/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(() => 'event-id'),
}));

vi.mock('@sentry/angular', () => ({
  captureException: captureExceptionMock,
}));

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

describe('AuthService.refreshMe', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    captureExceptionMock.mockClear();
  });

  afterEach(() => {
    http.verify();
  });

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
    http
      .expectOne('/api/auth/me')
      .flush('err', { status: 500, statusText: 'ERR' });
    await fail;

    expect(auth.company()?.name).toBe('Acme');
    expect(auth.meLoadError()).toContain('500');
    // 5xx left to sentryHttpInterceptor in the real app
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('clears me and session on 401 without meLoadError', async () => {
    const ok = auth.refreshMe();
    http.expectOne('/api/auth/me').flush(meWithCompany);
    await ok;

    const fail = auth.refreshMe();
    http
      .expectOne('/api/auth/me')
      .flush('unauth', { status: 401, statusText: 'Unauthorized' });
    await fail;

    expect(auth.company()).toBeNull();
    expect(auth.session()).toBeNull();
    expect(auth.meLoadError()).toBeNull();
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('captures unexpected 4xx (non-401) and keeps prior me', async () => {
    const ok = auth.refreshMe();
    http.expectOne('/api/auth/me').flush(meWithCompany);
    await ok;

    const fail = auth.refreshMe();
    http
      .expectOne('/api/auth/me')
      .flush('nope', { status: 403, statusText: 'Forbidden' });
    await fail;

    expect(auth.company()?.name).toBe('Acme');
    expect(auth.meLoadError()).toContain('403');
    expect(captureExceptionMock).toHaveBeenCalled();
  });
});
