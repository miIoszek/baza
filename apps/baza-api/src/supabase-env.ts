/**
 * Required Supabase env for Nest API boot and register compensation.
 * R2 keys are intentionally not included (optional until photo upload).
 */
export const REQUIRED_SUPABASE_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

export type RequiredSupabaseEnvKey =
  (typeof REQUIRED_SUPABASE_ENV_KEYS)[number];

export function getMissingSupabaseEnvKeys(
  env: NodeJS.ProcessEnv = process.env
): RequiredSupabaseEnvKey[] {
  return REQUIRED_SUPABASE_ENV_KEYS.filter((key) => !env[key]?.trim());
}

/**
 * Throws if any required Supabase env var is missing/blank after trim.
 * Call from bootstrap before `app.listen` so the process never accepts traffic
 * without admin credentials for Auth compensation.
 */
export function assertRequiredSupabaseEnv(
  env: NodeJS.ProcessEnv = process.env
): void {
  const missing = getMissingSupabaseEnvKeys(env);
  if (missing.length === 0) {
    return;
  }
  throw new Error(
    `Missing required Supabase env: ${missing.join(', ')}. Nest API will not start without SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.`
  );
}
