# E2E (Playwright)

## Run

```bash
npm run serve:frontend   # :4200
npx playwright test --project=firefox
```

Firefox only — ManageEngine blocks automated Chrome on this machine.

## storageState (authenticated specs)

1. Via CLI (after login in headed Firefox):

```bash
playwright-cli open http://localhost:4200/login --browser firefox --headed
# fill Email / Hasło, click Zaloguj się
playwright-cli state-save playwright/.auth/user.json
```

2. Or env-driven setup project:

```bash
export E2E_EMAIL='you@company.com'
export E2E_PASSWORD='…'
npx playwright test --project=setup
```

`playwright/.auth/` is gitignored. Specs matching `*.authenticated.spec.ts` use that file.

If `user.json` is missing or its Supabase token is expired, authenticated specs **skip** (they will not fail on `/login`). Refresh the session with env setup or `state-save` before expecting them to run.
