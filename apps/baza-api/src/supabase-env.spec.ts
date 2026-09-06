import {
  assertRequiredSupabaseEnv,
  getMissingSupabaseEnvKeys,
} from './supabase-env';

describe('supabase-env boot gate', () => {
  const complete = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
  };

  it('getMissingSupabaseEnvKeys returns empty when all three are set', () => {
    expect(getMissingSupabaseEnvKeys(complete)).toEqual([]);
  });

  it('getMissingSupabaseEnvKeys treats blank/whitespace as missing', () => {
    expect(
      getMissingSupabaseEnvKeys({
        ...complete,
        SUPABASE_SERVICE_ROLE_KEY: '   ',
      })
    ).toEqual(['SUPABASE_SERVICE_ROLE_KEY']);
  });

  it('getMissingSupabaseEnvKeys lists all missing keys', () => {
    expect(getMissingSupabaseEnvKeys({})).toEqual([
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ]);
  });

  it('assertRequiredSupabaseEnv is a no-op when complete', () => {
    expect(() => assertRequiredSupabaseEnv(complete)).not.toThrow();
  });

  it('assertRequiredSupabaseEnv names missing keys in the error message', () => {
    expect(() =>
      assertRequiredSupabaseEnv({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon',
      })
    ).toThrow(
      /Missing required Supabase env: SUPABASE_SERVICE_ROLE_KEY.*SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY/
    );
  });
});
