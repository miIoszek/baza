import request from 'supertest';
import {
  COUNTRY_CODES,
  DRIVER_LICENSE_CODES,
  DUPLICATE_APPLICATION_MESSAGE,
  HOME_RETURN_CADENCES,
  TRANSPORT_TYPE_CODES,
} from '@baza/shared-types';
import { createTestApp, type TestApp } from './test-app';
import { describeDb } from './test-db';

const PASSWORD = 'correct horse battery';

describeDb('companies, offers and applications (HTTP, real Postgres)', () => {
  let t: TestApp;
  let seq = 0;

  beforeAll(async () => {
    t = await createTestApp({ AUTH_REQUIRE_EMAIL_VERIFICATION: 'false' });
  });
  afterAll(async () => {
    await t?.close();
  });

  const http = () => request(t.app.getHttpServer());
  const q = (sql: string, params: unknown[] = []) =>
    t.db.dataSource.query(sql, params);
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** Registers a company (verification disabled in this suite) and logs in. */
  async function company(name = 'Acme Trans') {
    const email = `owner${++seq}@example.com`;
    const nip = String(1000000000 + seq);
    const reg = await http().post('/api/auth/register').send({
      name,
      nip,
      email,
      password: PASSWORD,
      description: 'Opis',
      baseLocation: 'Warszawa',
      termsAccepted: true,
    });
    expect(reg.status).toBe(202);
    expect(reg.body).toEqual({ emailVerificationRequired: false });
    const res = await http()
      .post('/api/auth/login')
      .set('Origin', t.origin)
      .send({ email, password: PASSWORD });
    expect(res.status).toBe(200);
    const token = res.body.accessToken as string;
    const me = await http().get('/api/auth/me').set(bearer(token));
    return { email, token, companyId: me.body.company.id as string };
  }

  const offerPayload = (over: Record<string, unknown> = {}) => ({
    title: 'Kierowca C+E na trasy międzynarodowe',
    description: 'Praca w systemie 4/1',
    homeReturnCadence: HOME_RETURN_CADENCES[0],
    requiredYearsExperience: 2,
    requiredTransportType: TRANSPORT_TYPE_CODES[0],
    licenseCategory: DRIVER_LICENSE_CODES[0],
    employmentForms: ['uop'],
    routes: [
      {
        from: { code: COUNTRY_CODES[0], name: 'A' },
        to: { code: COUNTRY_CODES[1], name: 'B' },
      },
    ],
    salaryMin: 5000,
    salaryMax: 7000,
    salaryCurrency: 'PLN',
    ...over,
  });

  const setCoords = (token: string) =>
    http()
      .patch('/api/company/profile')
      .set(bearer(token))
      .send({
        name: 'Acme Trans',
        nip: '1234567890',
        description: 'Opis',
        baseLocation: 'Warszawa',
        baseLat: 52.23,
        baseLng: 21.01,
      });

  it('updates the company profile and rejects DB-invalid data', async () => {
    const { token } = await company();
    const ok = await setCoords(token);
    expect(ok.status).toBe(200);
    expect(ok.body.baseLat).toBe(52.23);

    const bad = await http()
      .patch('/api/company/profile')
      .set(bearer(token))
      .send({
        name: 'Acme Trans',
        nip: '1234567890',
        description: 'Opis',
        baseLocation: 'Warszawa',
        baseLat: 52.23,
      });
    // A lone latitude violates the pair CHECK; the API answers 400, not 500.
    expect(bad.status).toBe(400);
  });

  it('runs the offer lifecycle and exposes published offers publicly', async () => {
    const { token, companyId } = await company('Lifecycle Sp. z o.o.');

    const noCoords = await http()
      .post('/api/company/offers')
      .set(bearer(token))
      .send(offerPayload());
    expect(noCoords.status).toBe(400);

    await setCoords(token);
    const created = await http()
      .post('/api/company/offers')
      .set(bearer(token))
      .send(offerPayload());
    expect(created.status).toBe(201);
    expect(created.body.companyName).toBe('Acme Trans');
    expect(created.body.salary).toEqual({ min: 5000, max: 7000, currency: 'PLN' });
    expect(created.body.baseLocation).toEqual({ lat: 52.23, lng: 21.01 });
    const offerId = created.body.id as string;

    const publicList = await http().get('/api/offers');
    expect(publicList.body.map((o: { id: string }) => o.id)).toContain(offerId);
    expect((await http().get(`/api/offers/${offerId}`)).status).toBe(200);

    const dir = await http().get('/api/companies');
    const entry = dir.body.find((c: { id: string }) => c.id === companyId);
    expect(entry.offerCount).toBe(1);
    expect(
      (await http().get(`/api/companies/${companyId}/offers`)).body
    ).toHaveLength(1);

    const updated = await http()
      .patch(`/api/company/offers/${offerId}`)
      .set(bearer(token))
      .send(offerPayload({ title: 'Nowy tytuł oferty', published: true, salaryMin: null, salaryMax: null, salaryCurrency: null }));
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe('Nowy tytuł oferty');
    expect(updated.body.salary).toBeUndefined();

    const unpublished = await http()
      .patch(`/api/company/offers/${offerId}/unpublish`)
      .set(bearer(token));
    expect(unpublished.body.published).toBe(false);
    expect((await http().get(`/api/offers/${offerId}`)).status).toBe(404);
    expect(
      (await http().get('/api/company/offers').set(bearer(token))).body
    ).toHaveLength(1);

    expect(
      (await http().delete(`/api/company/offers/${offerId}`).set(bearer(token))).status
    ).toBe(204);
    expect(
      (await http().get('/api/company/offers').set(bearer(token))).body
    ).toHaveLength(0);
  });

  it('isolates tenants: one company cannot touch or read another company data', async () => {
    const a = await company('Firma A');
    const b = await company('Firma B');
    await setCoords(a.token);
    const offer = (
      await http().post('/api/company/offers').set(bearer(a.token)).send(offerPayload())
    ).body;

    const patch = await http()
      .patch(`/api/company/offers/${offer.id}`)
      .set(bearer(b.token))
      .send(offerPayload({ published: true }));
    expect(patch.status).toBe(404);
    expect(
      (await http().patch(`/api/company/offers/${offer.id}/unpublish`).set(bearer(b.token))).status
    ).toBe(404);
    expect(
      (await http().delete(`/api/company/offers/${offer.id}`).set(bearer(b.token))).status
    ).toBe(404);
    expect((await http().get('/api/company/offers').set(bearer(b.token))).body).toEqual([]);

    // An application to A's offer is invisible to B and its CV cannot be fetched by B.
    const application = await q(
      `INSERT INTO job_applications
         (job_offer_id, company_id, email, phone, cv_file_key, consent_accepted_at)
       VALUES ($1, $2, 'kierowca@example.com', '+48 600 100 200', $3, now())
       RETURNING id`,
      [offer.id, a.companyId, `applications/${a.companyId}/${offer.id}/cv.pdf`]
    );
    const applicationId = application[0].id as string;

    const aList = await http().get('/api/company/applications').set(bearer(a.token));
    expect(aList.body).toHaveLength(1);
    expect(aList.body[0].jobOfferTitle).toBe(offer.title);
    expect(
      (await http().get('/api/company/applications').set(bearer(b.token))).body
    ).toEqual([]);
    // Private R2 is not configured in tests, so the download answers 503 before any lookup;
    // what matters is that B never gets the file.
    const cv = await http().get(`/api/company/applications/${applicationId}/cv`).set(bearer(b.token));
    expect([404, 503]).toContain(cv.status);

    // Deleting the offer cascades to its applications.
    await q(`DELETE FROM job_offers WHERE id = $1`, [offer.id]);
    expect(
      (await http().get('/api/company/applications').set(bearer(a.token))).body
    ).toEqual([]);
  });

  it('rejects a second application from the same e-mail and lists CV file names', async () => {
    const { token, companyId } = await company('Duplicate Co');
    await setCoords(token);
    const offer = (
      await http().post('/api/company/offers').set(bearer(token)).send(offerPayload())
    ).body;
    await q(
      `INSERT INTO job_applications
         (job_offer_id, company_id, email, phone, cv_file_key, cv_file_name, consent_accepted_at)
       VALUES ($1, $2, 'Kierowca@Example.com', '+48 600 100 200', $3, 'CV Łukasz.pdf', now())`,
      [offer.id, companyId, `applications/${companyId}/${offer.id}/cv.pdf`]
    );

    // Same address in another letter case: rejected before any CV upload, so it
    // answers 409 even though private R2 is not configured in tests.
    const again = await http()
      .post(`/api/offers/${offer.id}/applications`)
      .field('email', 'kierowca@example.com')
      .field('phone', '+48 600 100 200')
      .field('consentAccepted', 'true')
      .attach('cv', Buffer.from('%PDF-1.4\n'), {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      });
    expect(again.status).toBe(409);
    expect(again.body.message).toBe(DUPLICATE_APPLICATION_MESSAGE);

    const inbox = await http().get('/api/company/applications').set(bearer(token));
    expect(inbox.body).toHaveLength(1);
    expect(inbox.body[0].cvFileName).toBe('CV Łukasz.pdf');
  });

  it('filters public offers by license, transport and country', async () => {
    const { token } = await company('Filter Co');
    await setCoords(token);
    const other = DRIVER_LICENSE_CODES[DRIVER_LICENSE_CODES.length - 1];
    await http().post('/api/company/offers').set(bearer(token)).send(offerPayload({ licenseCategory: DRIVER_LICENSE_CODES[0] }));
    await http().post('/api/company/offers').set(bearer(token)).send(offerPayload({ licenseCategory: other, title: 'Inna kategoria prawa jazdy' }));

    const filtered = await http().get('/api/offers').query({ license: other });
    expect(filtered.status).toBe(200);
    expect(filtered.body.length).toBeGreaterThan(0);
    for (const o of filtered.body) {
      expect(o.licenseCategory).toBe(other);
    }
    expect((await http().get('/api/offers').query({ license: 'ZZ' })).status).toBe(400);
  });

  it('filters public offers by employment form overlap', async () => {
    const { token } = await company('Employment Co');
    await setCoords(token);
    await http()
      .post('/api/company/offers')
      .set(bearer(token))
      .send(offerPayload({ employmentForms: ['uop'], title: 'Tylko UoP' }));
    await http()
      .post('/api/company/offers')
      .set(bearer(token))
      .send(offerPayload({ employmentForms: ['b2b', 'zlecenie'], title: 'B2B' }));

    const filtered = await http().get('/api/offers').query({ employment: 'uop' });
    expect(filtered.status).toBe(200);
    expect(filtered.body.length).toBeGreaterThan(0);
    for (const o of filtered.body) {
      expect(o.employmentForms).toEqual(expect.arrayContaining(['uop']));
    }
    expect(filtered.body.some((o: { title: string }) => o.title === 'B2B')).toBe(
      false
    );
    expect((await http().get('/api/offers').query({ employment: 'cash' })).status).toBe(
      400
    );
  });
});
