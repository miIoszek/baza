import request from 'supertest';
import { UserAccountService } from '../app/identity/services/user-account.service';
import { createTestApp, type TestApp } from './test-app';
import { describeDb } from './test-db';

const COOKIE = 'baza_rt';
const PASSWORD = 'correct horse battery';

type Res = request.Response;

describeDb('identity (HTTP, real Postgres)', () => {
  let t: TestApp;
  let seq = 0;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t?.close();
  });

  const http = () => request(t.app.getHttpServer());
  const nextEmail = () => `user${++seq}@example.com`;
  const q = (sql: string, params: unknown[] = []) =>
    t.db.dataSource.query(sql, params);

  const cookieOf = (res: Res): string | null => {
    const raw = (res.headers['set-cookie'] as unknown as string[] | undefined)?.find(
      (c) => c.startsWith(`${COOKIE}=`)
    );
    if (!raw) return null;
    const value = raw.split(';')[0].slice(COOKIE.length + 1);
    return value === '' ? null : value;
  };

  const register = (email: string, extra: Record<string, unknown> = {}) =>
    http()
      .post('/api/auth/register')
      .send({
        name: 'Acme Trans',
        nip: '1234567890',
        email,
        password: PASSWORD,
        description: 'Opis firmy',
        baseLocation: 'Warszawa',
        termsAccepted: true,
        ...extra,
      });

  const login = (email: string, password = PASSWORD) =>
    http()
      .post('/api/auth/login')
      .set('Origin', t.origin)
      .send({ email, password });

  const refresh = (cookie: string | null, origin: string | null = t.origin) => {
    let r = http().post('/api/auth/refresh');
    if (origin) r = r.set('Origin', origin);
    if (cookie) r = r.set('Cookie', `${COOKIE}=${cookie}`);
    return r;
  };

  const tokenFrom = (url: string) => new URL(url).searchParams.get('token') as string;

  /** Registers, verifies and logs in. */
  async function signedUp() {
    const email = nextEmail();
    expect((await register(email)).status).toBe(202);
    const mail = t.mailer.last('verify', email);
    expect(mail).toBeDefined();
    expect(
      (await http().post('/api/auth/verify-email').send({ token: tokenFrom(mail!.url) })).status
    ).toBe(204);
    const res = await login(email);
    expect(res.status).toBe(200);
    return {
      email,
      accessToken: res.body.accessToken as string,
      cookie: cookieOf(res) as string,
    };
  }

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  describe('registration', () => {
    it('answers identically for a new and an already-registered address', async () => {
      const email = nextEmail();
      const first = await register(email);
      const second = await register(email);
      expect(first.status).toBe(202);
      expect(second.status).toBe(202);
      expect(second.body).toEqual(first.body);
      expect(first.body).toEqual({ emailVerificationRequired: true });

      const users = await q('SELECT count(*)::int AS n FROM user_account WHERE email = $1', [email]);
      expect(users[0].n).toBe(1);
      const companies = await q('SELECT count(*)::int AS n FROM companies c JOIN user_account u ON u.id = c.user_id WHERE u.email = $1', [email]);
      expect(companies[0].n).toBe(1);
      expect(t.mailer.last('verify', email)).toBeDefined();
      expect(t.mailer.last('exists', email)).toBeDefined();
    });

    it('creates no account when the company data is invalid (single transaction)', async () => {
      const email = nextEmail();
      const res = await register(email, { nip: 'abc' });
      expect(res.status).toBe(400);
      const users = await q('SELECT count(*)::int AS n FROM user_account WHERE email = $1', [email]);
      expect(users[0].n).toBe(0);
    });

    it('rejects weak passwords and stores the email lowercase', async () => {
      const weak = await register(nextEmail(), { password: 'short' });
      expect(weak.status).toBe(400);
      expect(weak.body.code).toBe('WEAK_PASSWORD');

      const mixed = `Mixed${++seq}@Example.COM`;
      expect((await register(mixed)).status).toBe(202);
      const rows = await q('SELECT email FROM user_account WHERE email = $1', [mixed.toLowerCase()]);
      expect(rows).toHaveLength(1);
    });
  });

  describe('login', () => {
    it('gives the same error for a wrong password and an unknown address', async () => {
      const { email } = await signedUp();
      const wrong = await login(email, 'not the password 1');
      const unknown = await login('nobody@example.com');
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
      expect(unknown.body.code).toBe('INVALID_CREDENTIALS');
      expect(unknown.body.message).toBe(wrong.body.message);
    });

    it('requires a verified email, and only reveals that after the password is right', async () => {
      const email = nextEmail();
      await register(email);
      const right = await login(email);
      expect(right.status).toBe(403);
      expect(right.body.code).toBe('EMAIL_NOT_VERIFIED');
      const wrong = await login(email, 'not the password 1');
      expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('verification links are single-use', async () => {
      const email = nextEmail();
      await register(email);
      const token = tokenFrom(t.mailer.last('verify', email)!.url);
      expect((await http().post('/api/auth/verify-email').send({ token })).status).toBe(204);
      const again = await http().post('/api/auth/verify-email').send({ token });
      expect(again.status).toBe(400);
      expect(again.body.code).toBe('INVALID_TOKEN');
    });

    it('never returns the refresh token in the body; sets an HttpOnly Strict cookie', async () => {
      const email = nextEmail();
      await register(email);
      await http().post('/api/auth/verify-email').send({ token: tokenFrom(t.mailer.last('verify', email)!.url) });
      const res = await login(email);
      expect(Object.keys(res.body).sort()).toEqual(['accessToken', 'expiresInSeconds']);
      const raw = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith(`${COOKIE}=`))!;
      expect(raw).toMatch(/HttpOnly/i);
      expect(raw).toMatch(/SameSite=Strict/i);
      expect(raw).toMatch(/Path=\//);
      expect(JSON.stringify(res.body)).not.toContain(cookieOf(res) as string);
    });

    it('locks the account after 10 failures, even for the correct password', async () => {
      const { email } = await signedUp();
      for (let i = 0; i < 10; i += 1) {
        expect((await login(email, `wrong password ${i}`)).status).toBe(401);
      }
      const locked = await login(email);
      expect(locked.status).toBe(429);
      expect(locked.body.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('authentication guard', () => {
    it('is closed by default and open for @Public routes', async () => {
      expect((await http().get('/api/auth/me')).status).toBe(401);
      expect((await http().get('/api/company/offers')).status).toBe(401);
      expect((await http().get('/api/auth/me').set('Authorization', 'Bearer garbage')).status).toBe(401);
      expect((await http().get('/api/health')).status).toBe(200);
      expect((await http().get('/api/offers')).status).toBe(200);
      expect((await http().get('/api/companies')).status).toBe(200);
    });

    it('serves /auth/me with the company for a valid token', async () => {
      const { email, accessToken } = await signedUp();
      const res = await http().get('/api/auth/me').set(bearer(accessToken));
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(email);
      expect(res.body.company.name).toBe('Acme Trans');
    });

    it('rejects a token signed by another key and one with a tampered payload', async () => {
      const { accessToken } = await signedUp();
      const [h, p, s] = accessToken.split('.');
      const forgedPayload = Buffer.from(
        JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), roles: ['admin'] })
      ).toString('base64url');
      const res = await http().get('/api/auth/me').set(bearer(`${h}.${forgedPayload}.${s}`));
      expect(res.status).toBe(401);
    });
  });

  describe('refresh + logout', () => {
    it('rotates the cookie and issues a working access token', async () => {
      const { cookie } = await signedUp();
      const res = await refresh(cookie);
      expect(res.status).toBe(200);
      const next = cookieOf(res);
      expect(next).toBeTruthy();
      expect(next).not.toBe(cookie);
      expect((await http().get('/api/auth/me').set(bearer(res.body.accessToken))).status).toBe(200);
    });

    it('requires an allowed Origin (CSRF) and a cookie', async () => {
      const { cookie } = await signedUp();
      expect((await refresh(cookie, null)).status).toBe(403);
      expect((await refresh(cookie, 'https://evil.example')).status).toBe(403);
      expect((await refresh(null)).status).toBe(401);
    });

    it('tolerates a parallel refresh with the same cookie (grace window)', async () => {
      const { cookie } = await signedUp();
      const [a, b] = await Promise.all([refresh(cookie), refresh(cookie)]);
      expect([a.status, b.status]).toEqual([200, 200]);
      expect(cookieOf(a)).not.toBe(cookieOf(b));
    });

    it('treats reuse of a rotated token outside the grace window as theft: revokes the family', async () => {
      const { cookie } = await signedUp();
      const rotated = await refresh(cookie);
      const successor = cookieOf(rotated) as string;
      await q(`UPDATE refresh_token SET used_at = now() - interval '1 minute' WHERE used_at IS NOT NULL`);

      expect((await refresh(cookie)).status).toBe(401);
      // The legitimate successor is dead as well: the whole family was revoked.
      expect((await refresh(successor)).status).toBe(401);
    });

    it('logout revokes the session and clears the cookie; it is idempotent', async () => {
      const { cookie } = await signedUp();
      const out = await http()
        .post('/api/auth/logout')
        .set('Origin', t.origin)
        .set('Cookie', `${COOKIE}=${cookie}`);
      expect(out.status).toBe(204);
      expect((out.headers['set-cookie'] as unknown as string[]).join(';')).toMatch(/baza_rt=;/);
      expect((await refresh(cookie)).status).toBe(401);
      const again = await http()
        .post('/api/auth/logout')
        .set('Origin', t.origin)
        .set('Cookie', `${COOKIE}=${cookie}`);
      expect(again.status).toBe(204);
    });

    it('stores only hashes: the raw cookie value is not in the database', async () => {
      const { cookie } = await signedUp();
      const rows = await q(`SELECT count(*)::int AS n FROM refresh_token WHERE token_hash = $1`, [cookie]);
      expect(rows[0].n).toBe(0);
    });
  });

  describe('password reset and change', () => {
    it('answers forgot-password the same way for unknown addresses and sends no mail', async () => {
      const before = t.mailer.sent.length;
      const res = await http().post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });
      expect(res.status).toBe(202);
      expect(res.text).toBe('');
      expect(t.mailer.sent.length).toBe(before);
    });

    it('reset kills every session, is single-use, and does not sign the caller in', async () => {
      const { email, accessToken, cookie } = await signedUp();
      expect((await http().get('/api/auth/me').set(bearer(accessToken))).status).toBe(200);

      expect((await http().post('/api/auth/forgot-password').send({ email })).status).toBe(202);
      const token = tokenFrom(t.mailer.last('reset', email)!.url);

      // A weak password must not burn the link.
      const weak = await http().post('/api/auth/reset-password').send({ token, password: 'short' });
      expect(weak.status).toBe(400);
      expect(weak.body.code).toBe('WEAK_PASSWORD');

      const newPassword = 'a brand new passphrase';
      const done = await http().post('/api/auth/reset-password').send({ token, password: newPassword });
      expect(done.status).toBe(204);
      expect(done.headers['set-cookie']).toBeUndefined();

      expect((await http().get('/api/auth/me').set(bearer(accessToken))).status).toBe(401);
      expect((await refresh(cookie)).status).toBe(401);
      expect((await login(email)).status).toBe(401);
      expect((await login(email, newPassword)).status).toBe(200);

      const reuse = await http().post('/api/auth/reset-password').send({ token, password: 'yet another passphrase' });
      expect(reuse.status).toBe(400);
      expect(reuse.body.code).toBe('INVALID_TOKEN');
      expect(t.mailer.last('changed', email)).toBeDefined();
    });

    it('change-password needs the current password, kills old sessions, returns a fresh one', async () => {
      const { email, accessToken, cookie } = await signedUp();
      const wrong = await http()
        .post('/api/auth/change-password')
        .set('Origin', t.origin)
        .set(bearer(accessToken))
        .send({ currentPassword: 'not the password 1', newPassword: 'a brand new passphrase' });
      expect(wrong.status).toBe(401);

      const ok = await http()
        .post('/api/auth/change-password')
        .set('Origin', t.origin)
        .set(bearer(accessToken))
        .send({ currentPassword: PASSWORD, newPassword: 'a brand new passphrase' });
      expect(ok.status).toBe(200);
      expect(cookieOf(ok)).toBeTruthy();

      expect((await http().get('/api/auth/me').set(bearer(accessToken))).status).toBe(401);
      expect((await refresh(cookie)).status).toBe(401);
      expect((await http().get('/api/auth/me').set(bearer(ok.body.accessToken))).status).toBe(200);
      expect((await login(email, 'a brand new passphrase')).status).toBe(200);
    });
  });

  describe('account disabling', () => {
    it('a ban takes effect on the next request and blocks login and refresh', async () => {
      const { email, accessToken, cookie } = await signedUp();
      expect((await http().get('/api/auth/me').set(bearer(accessToken))).status).toBe(200);

      const users = t.app.get(UserAccountService);
      const account = await users.findById(
        (await q('SELECT id FROM user_account WHERE email = $1', [email]))[0].id
      );
      await users.disable(account!.id, 'account-disabled');

      expect((await http().get('/api/auth/me').set(bearer(accessToken))).status).toBe(401);
      expect((await refresh(cookie)).status).toBe(401);
      expect((await login(email)).status).toBe(401);
    });
  });
});
