import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const withToken = <T>(req: HttpRequest<T>, token: string): HttpRequest<T> =>
  req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
    withCredentials: true,
  });

/**
 * Attaches the in-memory access token to API calls. It never blocks anonymous browsing: with no
 * session there is nothing to wait for. On a 401 for a request that carried a token it refreshes
 * ONCE (shared with any concurrent refresh) and replays the request; if the refresh fails the
 * session is already cleared and the original 401 is propagated.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  const auth = inject(AuthService);

  if (!auth.hasSession()) {
    return next(req);
  }

  return from(auth.getAccessToken()).pipe(
    switchMap((token) => {
      if (!token) {
        return next(req);
      }
      return next(withToken(req, token)).pipe(
        catchError((err: unknown) => {
          if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
            return throwError(() => err);
          }
          return from(auth.refreshSession()).pipe(
            switchMap((ok) => {
              const retried = ok ? auth.currentAccessToken() : null;
              return retried
                ? next(withToken(req, retried))
                : throwError(() => err);
            })
          );
        })
      );
    })
  );
};
