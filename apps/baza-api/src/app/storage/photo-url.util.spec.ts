import {
  rewriteR2PhotoUrl,
  rewriteR2PhotoUrls,
} from './photo-url.util';

describe('rewriteR2PhotoUrls', () => {
  const publicBase = 'https://pub-fc53a13a5e564e91a116f9ebb2036071.r2.dev';

  beforeEach(() => {
    process.env['R2_PUBLIC_URL'] = publicBase;
  });

  afterEach(() => {
    delete process.env['R2_PUBLIC_URL'];
  });

  it('rewrites S3 API host to R2_PUBLIC_URL', () => {
    const input = {
      s96: 'https://86ebf1237b6e38a608067182849713c8.r2.cloudflarestorage.com/companies/user-1/logo/s96.webp',
    };

    expect(rewriteR2PhotoUrls(input)).toEqual({
      s96: `${publicBase}/companies/user-1/logo/s96.webp`,
    });
  });

  it('leaves already-public URLs unchanged', () => {
    const url = `${publicBase}/companies/user-1/logo/s96.webp`;
    expect(rewriteR2PhotoUrls({ s96: url })).toEqual({ s96: url });
  });

  it('returns null for null input', () => {
    expect(rewriteR2PhotoUrls(null)).toBeNull();
  });
});

describe('rewriteR2PhotoUrl', () => {
  it('rewrites a single URL', () => {
    expect(
      rewriteR2PhotoUrl(
        'https://acct.r2.cloudflarestorage.com/companies/u/logo/original.jpg',
        'https://pub-example.r2.dev'
      )
    ).toBe('https://pub-example.r2.dev/companies/u/logo/original.jpg');
  });

  it('preserves cache-bust query when rewriting', () => {
    expect(
      rewriteR2PhotoUrl(
        'https://acct.r2.cloudflarestorage.com/companies/u/logo/s96.webp?v=1710000000000',
        'https://pub-example.r2.dev'
      )
    ).toBe(
      'https://pub-example.r2.dev/companies/u/logo/s96.webp?v=1710000000000'
    );
  });
});
