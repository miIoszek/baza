---
project: baza
deployed_at: 2026-09-04
status: live-scaffold
phase: api-fe-postgres-r2-wired
next_plan: company-registry-form (FR-001) — not started
---

# Deploy plan — Baza (first ship)

Audit trail for Lesson 5 Plan Mode deploy. Platform decision: `@context/foundation/infrastructure.md`. Stack: `@context/foundation/tech-stack.md`.

## What is live

| Surface | URL / name | Status |
|---------|------------|--------|
| Nest API (Railway) | https://baza-api-production-4306.up.railway.app | Live — `GET /api/health` returns `ok` / `baza-api` |
| Angular SPA (Cloudflare Pages) | https://baza-app.pages.dev | Live (HTTP 200); project name `baza-app` (name `baza` failed to create) |
| Preview deploy example | https://8ce8f45f.baza-app.pages.dev | Used for first CORS allow-list |
| R2 bucket | `baza-uploads` | Created 2026-09-04 |
| Postgres + auth | Railway Postgres (private network) + `AUTH_*` variables | Migrations run at API boot; company register / login / refresh live on the API; Nest refuses to boot without `DATABASE_URL` (and, in production, `AUTH_JWT_SIGNING_KEYS`, `AUTH_WEB_BASE_URL`, `CORS_ORIGIN`) |

## Smoke — FE ↔ API

1. API: `GET https://baza-api-production-4306.up.railway.app/api/health` → JSON `{ status, service, timestamp }`.
2. CORS: `CORS_ORIGIN` includes `https://baza-app.pages.dev` (and preview host as needed).
3. FE production build bakes `apiBaseUrl` from [`apps/baza-frontend/src/environments/environment.production.ts`](../apps/baza-frontend/src/environments/environment.production.ts) → Railway origin.
4. Browser: open https://baza-app.pages.dev — UI should show health line (`ok · baza-api · …`).

## Railway (API)

- **Project:** `baza` (id `012e8c2b-5eed-41af-873c-0aaa5d8fa753`)
- **Service:** `baza-api`
- **Root:** `/` (shared Nx monorepo)
- **Config:** [`railway.toml`](../../railway.toml) + root `package.json` scripts `build` / `start`
- **Start:** `node dist/apps/baza-api/main.js` (via `npm run start`)
- **Note:** Railpack currently runs root `npm run build` (API + FE). Prefer tightening later to `npm run build:api` only.

### Code prerequisites shipped

- Nest listens on `0.0.0.0` — [`apps/baza-api/src/main.ts`](../../apps/baza-api/src/main.ts)
- CORS from `CORS_ORIGIN` — [`libs/api/core/src/lib/configure-app.ts`](../../libs/api/core/src/lib/configure-app.ts)
- FE consumes `/api/health` — [`apps/baza-frontend/src/app/app.ts`](../../apps/baza-frontend/src/app/app.ts)
- Env name template — [`.env.example`](../../.env.example)
- **Boot gate:** Nest refuses to start without `DATABASE_URL`; in production also `AUTH_JWT_SIGNING_KEYS`, `AUTH_WEB_BASE_URL` and an exact `CORS_ORIGIN` (see `apps/baza-api/src/app/identity/identity.config.ts`, `libs/api/data-access/src/lib/database.config.ts`).

## Cloudflare Pages (FE)

- **Project:** `baza-app`
- **Deploy command used:**  
  `npx wrangler pages deploy dist/apps/baza-frontend/browser --project-name=baza-app --commit-dirty=true`
- **Not used:** `wrangler deploy` (Workers) — Pages only.
- **Env on Pages:** `apiBaseUrl` is empty (same-origin `/api`, proxied by `apps/baza-frontend/functions/api/[[path]].ts`). The Pages project needs `API_ORIGIN` and `PROXY_SHARED_SECRET` (same value as on the API). No DB or signing secrets on Pages.

## Secrets / env — wired vs pending

| Variable | Where | Status |
|----------|-------|--------|
| `CORS_ORIGIN` | Railway | Wired (Pages production + preview hosts) |
| `DATABASE_URL` | Railway | Reference variable `${{Postgres.DATABASE_URL}}` (private host) — **required for Nest boot** |
| `AUTH_JWT_SIGNING_KEYS` | Railway | base64 JSON keyring (ES256); **required in production**; **never** on Pages |
| `PROXY_SHARED_SECRET` | Railway + Pages | Lets the API trust the client IP forwarded by the Pages proxy (rate limiting) |
| `R2_ACCOUNT_ID` | Railway | Wired by user |
| `R2_ACCESS_KEY_ID` | Railway | Wired by user |
| `R2_SECRET_ACCESS_KEY` | Railway | Wired by user |
| `R2_BUCKET` | Railway | Expect `baza-uploads` |
| `R2_PUBLIC_URL` | Railway | Optional / as configured |
| Pages Function proxy | Pages project variables | `API_ORIGIN`, `PROXY_SHARED_SECRET` (secret) — set in the Cloudflare Pages project, not in GitHub |
| R2 SDK / upload routes in Nest | Code | Shipped for register photo; keep R2 vars on Railway only |
| `SENTRY_DSN` | Railway | API project (`baza-api`) — runtime; empty = SDK no-op |
| `SENTRY_ENVIRONMENT` | Railway (optional) | e.g. `production` |
| `SENTRY_RELEASE` | Railway (optional) | Prefer explicit; else webpack/plugin uses `RAILWAY_GIT_COMMIT_SHA` when present |
| `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` | Railway (build) | Source map + release upload during `build:api` (`SENTRY_PROJECT` default `baza-api`) — **never** on Pages |
| `SENTRY_DSN` | GitHub Actions (FE job) | Public browser DSN for project `baza-frontend` → `write-fe-production-env.mjs` |
| `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` | GitHub Actions (FE job) | FE source map upload after `nx build` — **never** bake into `environment.*.ts` or Cloudflare Pages |

Two Sentry projects: **`baza-api`** (Nest) and **`baza-frontend`** (Angular). Prefer shared release name = git commit SHA. Auth token is upload-only; public DSN may appear in the browser bundle (same trust model as Supabase anon).

## GitHub Actions (primary redeploy path)

Workflows:

- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — on PR + `main`: `npm run lint`, `test`, `build`
- [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) — on `main` only, path-filtered:
  - API paths → `railway up --service=baza-api --ci`
  - FE paths → write prod env from secrets → `nx build baza-frontend` → `wrangler pages deploy`

### Required GitHub Actions secrets

| Secret | Used by |
|--------|---------|
| `RAILWAY_TOKEN` | API deploy job |
| `CLOUDFLARE_API_TOKEN` | Pages deploy (Wrangler) |
| `CLOUDFLARE_ACCOUNT_ID` | Pages deploy |
| `API_BASE_URL` (repository variable, optional) | FE production env writer; leave empty for same-origin `/api` |
| `SENTRY_DSN` | FE production env writer (public browser DSN → `environment.sentryDsn`; optional) |
| `SENTRY_AUTH_TOKEN` | FE source map / release upload (optional until Sentry wired) |
| `SENTRY_ORG` | Sentry org slug for CLI upload |
| `SENTRY_PROJECT` | FE project slug (expect `baza-frontend`) |

Path filters (see `deploy.yml`): API also watches `libs/api/**`, `libs/shared/**`, lockfile/Nx config, `railway.toml`. FE watches `apps/baza-frontend/**`, `libs/baza/**`, `libs/shared/**`, lockfile/Nx config. Shared-lib or root package changes redeploy both.

FE build writes `environment.production.ts` via `scripts/write-fe-production-env.mjs` in the runner only (Sentry values; `apiBaseUrl` empty = same-origin) — the committed file stays a placeholder.

## Redeploy cheat-sheet (manual fallback)

```bash
# API
railway up --ci -m "describe change"

# FE (after setting environment.production.ts apiBaseUrl if API host changes)
npx nx build baza-frontend --configuration=production
npx wrangler pages deploy dist/apps/baza-frontend/browser --project-name=baza-app --commit-dirty=true
```

## Human-only (do not automate)

- Billing / Hobby upgrade on Railway
- Drop the old Supabase project (irreversible; only after the cutover is verified and the user confirms)
- Delete R2 bucket or account API tokens
- Custom DNS

## Out of scope / next plan

**Not in this deploy:** company registry form (FR-001), Auth UI, Postgres schema migrations, R2 upload implementation.

**Next plan (separate):** prosty formularz rejestracji firm + (opcjonalnie) upload zdjęcia przez R2 używając już podpiętych env.
