import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

const dsn = environment.sentryDsn?.trim();
if (dsn) {
  Sentry.init({
    dsn,
    environment: environment.production ? 'production' : 'development',
    release: environment.sentryRelease?.trim() || undefined,
    // Errors-first — avoid free-tier burn from performance traces.
    tracesSampleRate: 0,
  });
}

bootstrapApplication(App, appConfig).catch((err) => {
  console.error(err);
  if (dsn) {
    Sentry.captureException(err);
  }
});
