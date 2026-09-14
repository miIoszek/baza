import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/angular', () => ({
  captureException: vi.fn(() => 'event-id'),
}));

import * as Sentry from '@sentry/angular';
import { sentryHttpInterceptor } from './sentry-http.interceptor';

describe('sentryHttpInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    vi.mocked(Sentry.captureException).mockClear();
  });

  function run(
    err: unknown
  ): Promise<{ captured: boolean; rethrown: unknown }> {
    const req = new HttpRequest('GET', '/api/health');
    return new Promise((resolve) => {
      TestBed.runInInjectionContext(() => {
        sentryHttpInterceptor(req, () => throwError(() => err)).subscribe({
          error: (rethrown) => {
            resolve({
              captured: vi.mocked(Sentry.captureException).mock.calls.length > 0,
              rethrown,
            });
          },
        });
      });
    });
  }

  it('captures 5xx and rethrows', async () => {
    const err = new HttpErrorResponse({ status: 500, statusText: 'ERR' });
    const { captured, rethrown } = await run(err);
    expect(captured).toBe(true);
    expect(rethrown).toBe(err);
  });

  it('captures network failure (status 0) and rethrows', async () => {
    const err = new HttpErrorResponse({ status: 0, statusText: 'Unknown' });
    const { captured, rethrown } = await run(err);
    expect(captured).toBe(true);
    expect(rethrown).toBe(err);
  });

  it('does not capture 404', async () => {
    const err = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
    const { captured, rethrown } = await run(err);
    expect(captured).toBe(false);
    expect(rethrown).toBe(err);
  });

  it('does not capture 401', async () => {
    const err = new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
    });
    const { captured } = await run(err);
    expect(captured).toBe(false);
  });

  it('passes through successful responses', async () => {
    const req = new HttpRequest('GET', '/api/health');
    await new Promise<void>((resolve, reject) => {
      TestBed.runInInjectionContext(() => {
        sentryHttpInterceptor(req, () =>
          of(new HttpResponse({ status: 200, body: { ok: true } }))
        ).subscribe({
          next: (res) => {
            try {
              expect(res instanceof HttpResponse).toBe(true);
              if (res instanceof HttpResponse) {
                expect(res.status).toBe(200);
              }
              expect(Sentry.captureException).not.toHaveBeenCalled();
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          error: reject,
        });
      });
    });
  });
});
