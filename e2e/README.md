# E2E (Playwright)

## Run

```bash
npm run serve:api        # :3000 (needs DATABASE_URL, see .env.example)
npm run serve:frontend   # :4200, proxies /api -> :3000
npx playwright test --project=firefox
```

Firefox only — ManageEngine blocks automated Chrome on this machine.

## Authenticated specs (`*.authenticated.spec.ts`)

They sign in as a real company through `POST /api/auth/login` (see `e2e/authenticated.ts`):

```bash
export E2E_EMAIL='you@company.com'      # a VERIFIED company account
export E2E_PASSWORD='…'
npx playwright test --project=firefox-authenticated
```

Locally, put both in `.env` and run `npm run dev:seed` once (creates and verifies that company, with
offers and applications), then `npm run test:e2e:auth` — it loads `.env` for Playwright.

Without `E2E_EMAIL` / `E2E_PASSWORD` these specs **skip**.

### Why there is no shared `storageState`

The refresh token is a **rotating** HttpOnly cookie. A saved `storageState` would replay one cookie
from many parallel browser contexts (and from later runs). The API treats reuse of an already
rotated token outside a 10 s grace window as theft and revokes the entire session family, so shared
state produces random 401s. Each test therefore logs in with its own session.

The cookie is `baza_rt` (`__Host-baza_rt` when `AUTH_SECURE_COOKIES=true`, i.e. production). The
API requires an allowed `Origin` on cookie endpoints; `authenticated.ts` sends `baseURL`.

To get a verified account locally, register through the UI with `AUTH_REQUIRE_EMAIL_VERIFICATION=false`
on the API, or open the link the API logs when `MAIL_TRANSPORT=log`.
