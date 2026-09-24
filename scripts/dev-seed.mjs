// Seeds the LOCAL environment with a verified test company, a base pin, offers and CV
// applications — through the real API, so it doubles as a smoke test of auth, R2 uploads and
// the offer rules.
//
//   docker compose up -d db
//   npm run serve:api        (http://localhost:3000)
//   npm run dev:seed
//
// The account is E2E_EMAIL / E2E_PASSWORD from .env (the same the authenticated e2e specs use).
// Runs only against a database and an API on localhost. Running it again adds nothing.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.loadEnvFile(join(root, '.env'));

const API = process.env.SEED_API_URL ?? 'http://localhost:3000';
const ORIGIN = process.env.AUTH_WEB_BASE_URL ?? 'http://localhost:4200';
const { E2E_EMAIL: email, E2E_PASSWORD: password, DATABASE_URL: databaseUrl } = process.env;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (!email || !password) {
  fail('Set E2E_EMAIL and E2E_PASSWORD in .env (the test company account).');
}
const local = (url) => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
if (!databaseUrl || !local(databaseUrl) || !local(API)) {
  fail('dev-seed only runs against a database and an API on localhost.');
}

const COMPANY = {
  name: 'Transgór Logistics (test)',
  nip: '7781454968',
  description:
    'Firma testowa z lokalnego środowiska. Stałe trasy do Włoch, Niemiec i Hiszpanii, zestawy pod plandeką i chłodnie.',
  baseLocation: 'ul. Bałtycka 21, 61-013 Poznań',
  // Poznań from the PRNG list (what "Miejscowość bazy" would set)
  baseLat: 52.4108,
  baseLng: 16.9383,
};

const route = (from, fromName, to, toName) => ({
  from: { code: from, name: fromName },
  to: { code: to, name: toName },
});

const OFFERS = [
  {
    title: 'Kierowca C+E — trasy PL–IT',
    description:
      'Stałe trasy Poznań — północne Włochy, ładunki paletowe pod plandeką.\nZestaw przypisany na stałe do kierowcy. Powrót do bazy co dwa tygodnie.',
    homeReturnCadence: 'biweekly',
    requiredYearsExperience: 2,
    requiredTransportType: 'curtain',
    licenseCategory: 'C_E',
    employmentForms: ['uop', 'b2b'],
    routes: [route('PL', 'Polska', 'IT', 'Włochy'), route('IT', 'Włochy', 'PL', 'Polska')],
    salaryMin: 8000,
    salaryMax: 10000,
    salaryCurrency: 'PLN',
    published: true,
  },
  {
    title: 'Kierowca C — chłodnia, Niemcy',
    description: 'Dystrybucja chłodnicza po zachodnich Niemczech, powrót co tydzień.',
    homeReturnCadence: 'weekly',
    requiredYearsExperience: 1,
    requiredTransportType: 'reefer',
    licenseCategory: 'C',
    employmentForms: ['uop'],
    routes: [route('PL', 'Polska', 'DE', 'Niemcy')],
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    published: true,
  },
  {
    title: 'Kierowca C+E — Hiszpania (szkic)',
    description: 'Szkic: trasy do Hiszpanii przez Francję, powrót co miesiąc.',
    homeReturnCadence: 'monthly',
    requiredYearsExperience: 3,
    requiredTransportType: 'curtain',
    licenseCategory: 'C_E',
    employmentForms: ['b2b'],
    routes: [route('PL', 'Polska', 'ES', 'Hiszpania'), route('ES', 'Hiszpania', 'PL', 'Polska')],
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    published: false,
  },
];

// [offer index, email, phone, message, CV file name]
const APPLICATIONS = [
  [0, 'jan.kowalski@example.com', '+48 600 100 200', 'Jeżdżę 6 lat na plandece, głównie Włochy.\nMogę zacząć od października.', 'CV Jan Kowalski.pdf'],
  [0, 'piotr.nowak@example.com', '511 222 333', '', 'cv-nowak.pdf'],
  [1, 'anna.wisniewska@example.com', '+48 698 110 447', 'Mam doświadczenie w chłodniach, ADR ważny do 2027.', 'Anna Wiśniewska - CV.pdf'],
];

/** A small valid PDF, enough for the API's %PDF- check and for a viewer. */
function testPdf(title) {
  const text = `BT /F1 18 Tf 72 760 Td (${title.normalize('NFD').replace(/[^\x20-\x7e]/g, '')}) Tj ET`;
  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
    `<</Length ${text.length}>>stream\n${text}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj${obj}endobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([body], { type: 'application/pdf' });
}

async function call(path, init = {}, token) {
  const headers = { Origin: ORIGIN, ...(init.headers ?? {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new Error(`${init.method ?? 'GET'} ${path} → HTTP ${res.status} ${message ?? ''}`.trim());
  }
  return body;
}

function form(fields) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.append(key, String(value));
  }
  return data;
}

// 1. The API must be up (it also runs the migrations).
try {
  await call('/api/health');
} catch {
  fail(`API not reachable at ${API} — start it with: npm run serve:api`);
}

// 2. Account + company. Registration answers 202 whether or not the e-mail exists.
const { baseLat, baseLng, ...registration } = COMPANY;
await call('/api/auth/register', {
  method: 'POST',
  body: form({ ...registration, email, password, termsAccepted: 'true' }),
});

// 3. Verify the e-mail directly (locally the link only goes to the API log).
const db = new pg.Client({ connectionString: databaseUrl });
await db.connect();
await db.query(
  'UPDATE user_account SET email_verified_at = now() WHERE lower(email) = lower($1) AND email_verified_at IS NULL',
  [email]
);
await db.end();

// 4. Sign in.
let token;
try {
  ({ accessToken: token } = await call('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }));
} catch (err) {
  fail(`${err.message}\n  The account may exist with another password: set E2E_PASSWORD to it, or delete the user row.`);
}

const existing = await call('/api/company/offers', {}, token);
if (existing.length > 0) {
  console.log(`✔ Already seeded: ${email} has ${existing.length} offers. Nothing added.`);
  process.exit(0);
}

// 5. Profile: base pin and logo (uploaded to the configured R2 bucket).
const profile = form({ ...COMPANY, baseLat, baseLng });
const logo = readFileSync(join(root, 'apps/baza-frontend/public/baza-logo.png'));
profile.append('photo', new Blob([logo], { type: 'image/png' }), 'logo.png');
await call('/api/company/profile', { method: 'PATCH', body: profile }, token);

// 6. Offers (two published, one draft).
const offers = [];
for (const offer of OFFERS) {
  offers.push(
    await call(
      '/api/company/offers',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(offer) },
      token
    )
  );
}

// 7. Driver applications with CVs (public endpoint, no account).
for (const [offerIdx, appEmail, phone, message, fileName] of APPLICATIONS) {
  const data = form({ email: appEmail, phone, consentAccepted: 'true', ...(message ? { message } : {}) });
  data.append('cv', testPdf(`CV testowe: ${appEmail}`), fileName);
  await call(`/api/offers/${offers[offerIdx].id}/applications`, { method: 'POST', body: data });
}

console.log(`✔ Seeded ${email}: logo, base pin (Poznań), ${offers.length} offers, ${APPLICATIONS.length} applications.
  Sign in at ${ORIGIN}/login — the password is E2E_PASSWORD in .env.`);
