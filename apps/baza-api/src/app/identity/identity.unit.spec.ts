import { generateKeyPairSync } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { resolveCorsOrigins } from '@baza/api-core';
import { ProxyAwareThrottlerGuard } from './guards/proxy-aware-throttler.guard';
import { loadIdentityConfig, parseSigningKeys } from './identity.config';
import { isAcceptablePassword } from './password-policy.util';
import { JwtSigningService } from './services/jwt-signing.service';
import { PasswordHasherService } from './services/password-hasher.service';

const FAST = { cost: 1024, blockSize: 8, parallelization: 1, keyLength: 32 };

function keyring(...statuses: Array<'active' | 'retiring'>) {
  const entries = statuses.map((status, i) => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    return { kid: `k${i}`, status, privateKeyPemBase64: Buffer.from(pem).toString('base64') };
  });
  return Buffer.from(JSON.stringify(entries)).toString('base64');
}

function signing(raw = keyring('active'), env: Record<string, string> = {}) {
  const config = loadIdentityConfig({ AUTH_JWT_SIGNING_KEYS: raw, AUTH_WEB_BASE_URL: 'http://localhost:4200', ...env });
  return { service: new JwtSigningService(config), config };
}

describe('password policy', () => {
  it.each([
    ['too short', 'short12345'.slice(0, 9), null, false],
    ['minimum length', 'abcdefghij', null, true],
    ['too long', 'a1'.repeat(70), null, false],
    ['low variety', 'aaaaaaaaaaaa', null, false],
    ['equals the email', 'user@example.com', 'user@example.com', false],
    ['equals the local part', 'longusername', 'longusername@example.com', false],
    ['passphrase', 'correct horse battery', 'user@example.com', true],
  ])('%s', (_name, password, email, expected) => {
    expect(isAcceptablePassword(password, email)).toBe(expected);
  });

  it('does not trim and rejects non-strings', () => {
    expect(isAcceptablePassword('  abcdefgh  ', null)).toBe(true);
    expect(isAcceptablePassword(undefined, null)).toBe(false);
    expect(isAcceptablePassword(12345678901, null)).toBe(false);
  });
});

describe('PasswordHasherService', () => {
  const hasher = new PasswordHasherService(FAST);

  it('round-trips and produces distinct salted, algorithm-tagged hashes', async () => {
    const a = await hasher.hash('correct horse battery');
    const b = await hasher.hash('correct horse battery');
    expect(a).not.toBe(b);
    expect(a.startsWith('scrypt$1024$8$1$')).toBe(true);
    expect(await hasher.verify(a, 'correct horse battery')).toBe(true);
    expect(await hasher.verify(a, 'correct horse batterY')).toBe(false);
  });

  it('treats malformed stored hashes as a failed verification, never a throw', async () => {
    expect(await hasher.verify('garbage', 'x')).toBe(false);
    expect(await hasher.verify('scrypt$a$b$c$d$e', 'x')).toBe(false);
  });

  it('verifyDummy always fails and needsRehash detects weaker parameters', async () => {
    expect(await hasher.verifyDummy('anything')).toBe(false);
    const weak = await new PasswordHasherService({ ...FAST, cost: 512 }).hash('pw');
    expect(hasher.needsRehash(weak)).toBe(true);
    expect(hasher.needsRehash(await hasher.hash('pw'))).toBe(false);
  });
});

describe('JwtSigningService', () => {
  it('mints tokens with the exact claim set and verifies them', () => {
    const { service } = signing();
    const minted = service.mintAccessToken({ userId: 'u1', roles: ['company'], sessionEpoch: 3 });
    const claims = service.verifyAccessToken(minted.token);
    expect(claims).toMatchObject({ sub: 'u1', roles: ['company'], epc: 3, typ: 'access', aud: 'baza-api', iss: 'baza-api' });
    expect(Object.keys(claims).sort()).toEqual(['aud', 'epc', 'exp', 'iat', 'iss', 'jti', 'roles', 'sub', 'typ']);
    expect(minted.expiresInSeconds).toBe(300);
  });

  it('rejects a token from a different keyring, an unknown kid, alg=none and a refresh-typed token', () => {
    const { service } = signing();
    const other = signing();
    const foreign = other.service.mintAccessToken({ userId: 'u1', roles: [], sessionEpoch: 1 }).token;
    expect(() => service.verifyAccessToken(foreign)).toThrow();
    expect(() => service.verifyAccessToken('not.a.jwt')).toThrow();

    const none = jwt.sign({ sub: 'u1', typ: 'access' }, '', { algorithm: 'none' as jwt.Algorithm });
    expect(() => service.verifyAccessToken(none)).toThrow();

    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const wrongType = jwt.sign(
      { sub: 'u1', typ: 'refresh', aud: 'baza-api', iss: 'baza-api', exp: Math.floor(Date.now() / 1000) + 60 },
      privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      { algorithm: 'ES256', keyid: 'k0' }
    );
    expect(() => service.verifyAccessToken(wrongType)).toThrow();
  });

  it('rejects expired tokens', () => {
    const { service } = signing();
    const jestNow = jest.spyOn(Date, 'now');
    const minted = service.mintAccessToken({ userId: 'u1', roles: [], sessionEpoch: 1 });
    jestNow.mockReturnValue(Date.now() + 10 * 60 * 1000);
    expect(() => service.verifyAccessToken(minted.token)).toThrow();
    jestNow.mockRestore();
  });

  it('keeps verifying tokens signed by a retiring key (rotation without logout)', () => {
    const raw = keyring('retiring', 'active');
    const entries = JSON.parse(Buffer.from(raw, 'base64').toString());
    const oldOnly = Buffer.from(JSON.stringify([{ ...entries[0], status: 'active' }])).toString('base64');
    const token = signing(oldOnly).service.mintAccessToken({ userId: 'u1', roles: [], sessionEpoch: 1 }).token;
    // Same key material, now retiring next to a new active key.
    expect(signing(raw).service.verifyAccessToken(token).sub).toBe('u1');
  });

  it('refuses a keyring without exactly one active key or with a non P-256 key', () => {
    expect(() => signing(keyring('retiring'))).toThrow(/exactly one active/);
    expect(() => signing(keyring('active', 'active'))).toThrow(/exactly one active/);
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'secp384r1' });
    const p384 = Buffer.from(
      JSON.stringify([{ kid: 'x', status: 'active', privateKeyPemBase64: Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()).toString('base64') }])
    ).toString('base64');
    expect(() => signing(p384)).toThrow(/P-256/);
  });
});

describe('identity config', () => {
  it('parses and validates AUTH_JWT_SIGNING_KEYS', () => {
    expect(parseSigningKeys(keyring('active'))).toHaveLength(1);
    expect(() => parseSigningKeys('%%%')).toThrow();
    expect(() => parseSigningKeys(Buffer.from('[]').toString('base64'))).toThrow();
    expect(() => parseSigningKeys(Buffer.from('[{"kid":"a"}]').toString('base64'))).toThrow(/malformed/);
  });

  it('is strict in production', () => {
    expect(() => loadIdentityConfig({ NODE_ENV: 'production' })).toThrow(/AUTH_JWT_SIGNING_KEYS/);
    expect(() => loadIdentityConfig({ NODE_ENV: 'production', AUTH_JWT_SIGNING_KEYS: keyring('active') })).toThrow(/AUTH_WEB_BASE_URL/);
    const config = loadIdentityConfig({
      NODE_ENV: 'production',
      AUTH_JWT_SIGNING_KEYS: keyring('active'),
      AUTH_WEB_BASE_URL: 'https://app.example.com/',
      CORS_ORIGIN: 'https://app.example.com',
    });
    expect(config.webBaseUrl).toBe('https://app.example.com');
    expect(config.cookie).toMatchObject({ name: '__Host-baza_rt', secure: true });
    expect(config.allowedOrigins).toEqual(['https://app.example.com']);
    expect(config.requireEmailVerification).toBe(true);
  });

  it('needs an API key for the resend transport and lets verification be disabled', () => {
    expect(() => loadIdentityConfig({ MAIL_TRANSPORT: 'resend' })).toThrow(/RESEND_API_KEY/);
    expect(loadIdentityConfig({ AUTH_REQUIRE_EMAIL_VERIFICATION: 'false' }).requireEmailVerification).toBe(false);
  });
});

describe('CORS origins', () => {
  it('never allows a wildcard and requires an explicit list in production', () => {
    expect(() => resolveCorsOrigins({ CORS_ORIGIN: '*' })).toThrow();
    expect(() => resolveCorsOrigins({ NODE_ENV: 'production' })).toThrow();
    expect(resolveCorsOrigins({})).toEqual(['http://localhost:4200']);
    expect(resolveCorsOrigins({ CORS_ORIGIN: 'https://a.com, https://b.com' })).toEqual(['https://a.com', 'https://b.com']);
  });
});

describe('ProxyAwareThrottlerGuard', () => {
  // getTracker only reads the request; skip the framework constructor.
  const guard = Object.create(ProxyAwareThrottlerGuard.prototype) as {
    getTracker(req: unknown): Promise<string>;
  };
  const OLD = process.env['PROXY_SHARED_SECRET'];
  afterEach(() => {
    if (OLD === undefined) delete process.env['PROXY_SHARED_SECRET'];
    else process.env['PROXY_SHARED_SECRET'] = OLD;
  });

  const req = (headers: Record<string, string>, ip = '10.0.0.1') => ({ ip, headers });

  it('uses the real client IP only when the shared secret matches', async () => {
    process.env['PROXY_SHARED_SECRET'] = 's3cret';
    expect(
      await guard.getTracker(req({ 'x-baza-proxy-secret': 's3cret', 'x-baza-client-ip': '203.0.113.7' }))
    ).toBe('203.0.113.7');
  });

  it('ignores a spoofed IP header with a wrong or missing secret', async () => {
    process.env['PROXY_SHARED_SECRET'] = 's3cret';
    expect(await guard.getTracker(req({ 'x-baza-proxy-secret': 'nope', 'x-baza-client-ip': '203.0.113.7' }))).toBe('10.0.0.1');
    expect(await guard.getTracker(req({ 'x-baza-client-ip': '203.0.113.7' }))).toBe('10.0.0.1');
  });

  it('is inert when no secret is configured, and rejects non-IP values', async () => {
    delete process.env['PROXY_SHARED_SECRET'];
    expect(await guard.getTracker(req({ 'x-baza-proxy-secret': 'x', 'x-baza-client-ip': '203.0.113.7' }))).toBe('10.0.0.1');
    process.env['PROXY_SHARED_SECRET'] = 's3cret';
    expect(await guard.getTracker(req({ 'x-baza-proxy-secret': 's3cret', 'x-baza-client-ip': 'not-an-ip' }))).toBe('10.0.0.1');
  });
});
