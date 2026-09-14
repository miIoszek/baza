import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import * as Sentry from '@sentry/angular';
import { catchError, throwError } from 'rxjs';

/**
 * Report unexpected HTTP failures (5xx + network) to Sentry, then rethrow
 * so page-local handlers still run. Skips expected 4xx.
 */
export const sentryHttpInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const status = err.status;
        const isNetwork = status === 0;
        const isServerError = status >= 500;
        if (isNetwork || isServerError) {
          Sentry.captureException(err);
        }
      } else {
        Sentry.captureException(err);
      }
      return throwError(() => err);
    })
  );
};
