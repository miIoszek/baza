type Env = Record<string, string | undefined>;

/**
 * Production strictness (required secrets, exact CORS list, Secure cookies) applies when
 * `NODE_ENV=production` OR the process runs on Railway. The second condition means a missing or
 * overridden NODE_ENV on the platform can never silently switch the API into its lenient dev mode
 * (ephemeral signing key, `localhost` defaults, mail bodies in logs).
 */
export function isProductionEnv(env: Env = process.env): boolean {
  return (
    env['NODE_ENV'] === 'production' ||
    !!env['RAILWAY_ENVIRONMENT_NAME']?.trim() ||
    !!env['RAILWAY_ENVIRONMENT']?.trim()
  );
}
