import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let auth: {
    hasSession: ReturnType<typeof vi.fn>;
    getAccessToken: ReturnType<typeof vi.fn>;
    refreshSession: ReturnType<typeof vi.fn>;
    currentAccessToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auth = {
      hasSession: vi.fn().mockReturnValue(true),
      getAccessToken: vi.fn().mockResolvedValue('tok-1'),
      refreshSession: vi.fn().mockResolvedValue(true),
      currentAccessToken: vi.fn().mockReturnValue('tok-2'),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('attaches the bearer token (with credentials) to API calls', async () => {
    const p = firstValueFrom(http.get('/api/offers'));
    await vi.waitFor(() => {
      const req = ctrl.expectOne('/api/offers');
      expect(req.request.headers.get('Authorization')).toBe('Bearer tok-1');
      expect(req.request.withCredentials).toBe(true);
      req.flush([]);
    });
    await p;
  });

  it('does not touch non-API requests', async () => {
    const p = firstValueFrom(http.get('/assets/x.json'));
    const req = ctrl.expectOne('/assets/x.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    await p;
    expect(auth.getAccessToken).not.toHaveBeenCalled();
  });

  it('never waits or refreshes for anonymous visitors', async () => {
    auth.hasSession.mockReturnValue(false);
    const p = firstValueFrom(http.get('/api/offers'));
    const req = ctrl.expectOne('/api/offers');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
    await p;
    expect(auth.getAccessToken).not.toHaveBeenCalled();
    expect(auth.refreshSession).not.toHaveBeenCalled();
  });

  it('on 401 refreshes once and replays the request with the new token', async () => {
    const p = firstValueFrom(http.get('/api/company/offers'));
    await vi.waitFor(() =>
      ctrl.expectOne('/api/company/offers').flush({}, { status: 401, statusText: 'Unauthorized' })
    );
    await vi.waitFor(() => {
      const retry = ctrl.expectOne('/api/company/offers');
      expect(retry.request.headers.get('Authorization')).toBe('Bearer tok-2');
      retry.flush(['ok']);
    });
    expect(await p).toEqual(['ok']);
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('propagates the 401 when the refresh fails, and does not loop', async () => {
    auth.refreshSession.mockResolvedValue(false);
    const p = firstValueFrom(http.get('/api/company/offers'));
    const assertion = expect(p).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() =>
      ctrl.expectOne('/api/company/offers').flush({}, { status: 401, statusText: 'Unauthorized' })
    );
    await assertion;
    ctrl.expectNone('/api/company/offers');
  });

  it('does not retry non-401 errors', async () => {
    const p = firstValueFrom(http.get('/api/company/offers'));
    const assertion = expect(p).rejects.toMatchObject({ status: 500 });
    await vi.waitFor(() =>
      ctrl.expectOne('/api/company/offers').flush('x', { status: 500, statusText: 'ERR' })
    );
    await assertion;
    expect(auth.refreshSession).not.toHaveBeenCalled();
  });
});
