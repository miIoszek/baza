export type BazaEnvironment = {
  production: boolean;
  apiBaseUrl: string;
  /** Public browser DSN; empty string = Sentry SDK no-op */
  sentryDsn: string;
  /** Optional release name (e.g. git SHA); empty = omit */
  sentryRelease: string;
};
