import { QueryFailedError } from 'typeorm';
import { createTestDb, describeDb, type TestDb } from './test-db';

describeDb('database schema (migrations)', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await db?.destroy();
  });

  const q = (sql: string, params: unknown[] = []) =>
    db.dataSource.query(sql, params);

  async function insertUser(email: string): Promise<string> {
    const rows = await q(
      `INSERT INTO user_account (email, password_hash) VALUES ($1, 'x') RETURNING id`,
      [email],
    );
    return rows[0].id as string;
  }

  async function insertCompany(userId: string, nip = '1234567890') {
    const rows = await q(
      `INSERT INTO companies (user_id, name, nip) VALUES ($1, 'Acme', $2) RETURNING id`,
      [userId, nip],
    );
    return rows[0].id as string;
  }

  it('creates every table', async () => {
    const rows = await q(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
      [db.schema],
    );
    const names = rows.map((r: { table_name: string }) => r.table_name);
    expect(names).toEqual(
      expect.arrayContaining([
        'user_account',
        'refresh_token',
        'auth_one_time_token',
        'companies',
        'job_offers',
        'job_applications',
      ]),
    );
  });

  it('rejects non-lowercase emails and duplicates', async () => {
    await expect(insertUser('Mixed@Example.com')).rejects.toBeInstanceOf(
      QueryFailedError,
    );
    await insertUser('dup@example.com');
    await expect(insertUser('dup@example.com')).rejects.toBeInstanceOf(
      QueryFailedError,
    );
  });

  it('refuses a loginable account without a password hash', async () => {
    await expect(
      q(`INSERT INTO user_account (email, password_hash) VALUES ('nohash@example.com', NULL)`),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('enforces company constraints (nip digits, coordinate pair, 1:1 owner)', async () => {
    const userId = await insertUser('owner1@example.com');
    await expect(insertCompany(userId, 'abc')).rejects.toBeInstanceOf(
      QueryFailedError,
    );
    const companyId = await insertCompany(userId);
    expect(companyId).toBeTruthy();
    await expect(insertCompany(userId)).rejects.toBeInstanceOf(QueryFailedError);
    await expect(
      q(`UPDATE companies SET base_lat = 10 WHERE id = $1`, [companyId]),
    ).rejects.toBeInstanceOf(QueryFailedError);
    await q(`UPDATE companies SET base_lat = 10, base_lng = 20 WHERE id = $1`, [
      companyId,
    ]);
  });

  it('cascades company -> offers -> applications and validates them', async () => {
    const userId = await insertUser('owner2@example.com');
    const companyId = await insertCompany(userId, '9876543210');

    const offer = await q(
      `INSERT INTO job_offers
         (company_id, title, description, home_return_cadence,
          required_years_experience, required_transport_type)
       VALUES ($1, 'Kierowca', 'Opis', 'weekly', 2, 'tir') RETURNING id, license_category`,
      [companyId],
    );
    expect(offer[0].license_category).toBe('C');
    const offerId = offer[0].id as string;

    await expect(
      q(`UPDATE job_offers SET license_category = 'Z' WHERE id = $1`, [offerId]),
    ).rejects.toBeInstanceOf(QueryFailedError);
    await expect(
      q(`UPDATE job_offers SET salary_min = 5000 WHERE id = $1`, [offerId]),
    ).rejects.toBeInstanceOf(QueryFailedError);

    const insertApp = (phone: string) =>
      q(
        `INSERT INTO job_applications
           (job_offer_id, company_id, email, phone, cv_file_key, consent_accepted_at)
         VALUES ($1, $2, 'k@example.com', $3, 'applications/x/y/cv.pdf', now())`,
        [offerId, companyId, phone],
      );
    await expect(insertApp('12345')).rejects.toBeInstanceOf(QueryFailedError);
    await insertApp('+48 600 100 200');

    await q(`DELETE FROM companies WHERE id = $1`, [companyId]);
    const left = await q(`SELECT count(*)::int AS n FROM job_applications`);
    expect(left[0].n).toBe(0);
  });

  it('cascades user deletion to the company and refresh tokens', async () => {
    const userId = await insertUser('owner3@example.com');
    await insertCompany(userId, '1112223334');
    await q(
      `INSERT INTO refresh_token (user_id, family_id, token_hash, generation, expires_at)
       VALUES ($1, gen_random_uuid(), repeat('a', 64), 1, now() + interval '1 day')`,
      [userId],
    );
    await q(`DELETE FROM user_account WHERE id = $1`, [userId]);
    const c = await q(`SELECT count(*)::int AS n FROM companies WHERE user_id = $1`, [userId]);
    const t = await q(`SELECT count(*)::int AS n FROM refresh_token WHERE user_id = $1`, [userId]);
    expect(c[0].n).toBe(0);
    expect(t[0].n).toBe(0);
  });
});
