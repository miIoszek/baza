export type BazaEnvironment = {
  production: boolean;
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** Public browser DSN; empty string = Sentry SDK no-op */
  sentryDsn: string;
};
