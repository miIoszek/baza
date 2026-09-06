---
project: baza
deployed_at: 2026-09-04
status: live-scaffold
phase: api-fe-supabase-r2-wired
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
| Supabase | Env vars on Railway (user-wired) | Auth + company register live on API; Nest boot requires `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` |

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
- **Boot gate:** Nest refuses to start without `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (see `apps/baza-api/src/supabase-env.ts`). Service role is required for API process start, not only for optional compensation.

## Cloudflare Pages (FE)

- **Project:** `baza-app`
- **Deploy command used:**  
  `npx wrangler pages deploy dist/apps/baza-frontend/browser --project-name=baza-app --commit-dirty=true`
- **Not used:** `wrangler deploy` (Workers) — Pages only.
- **Public env on Pages:** none required beyond baked `apiBaseUrl` (no Supabase service role, no R2 secrets).

## Secrets / env — wired vs pending

| Variable | Where | Status |
|----------|-------|--------|
| `CORS_ORIGIN` | Railway | Wired (Pages production + preview hosts) |
| `SUPABASE_URL` | Railway | Wired by user (values not stored in this file) — **required for Nest boot** |
| `SUPABASE_ANON_KEY` | Railway | Wired by user — **required for Nest boot** |
| `SUPABASE_SERVICE_ROLE_KEY` | Railway | Wired by user — **required for Nest boot** (admin register + compensation); **never** on Pages |
| `R2_ACCOUNT_ID` | Railway | Wired by user |
| `R2_ACCESS_KEY_ID` | Railway | Wired by user |
| `R2_SECRET_ACCESS_KEY` | Railway | Wired by user |
| `R2_BUCKET` | Railway | Expect `baza-uploads` |
| `R2_PUBLIC_URL` | Railway | Optional / as configured |
| Supabase anon on Pages | Pages / Actions | Injected at Pages build via GitHub Secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) — wire secrets before first Actions FE deploy |
| R2 SDK / upload routes in Nest | Code | Shipped for register photo; keep R2 vars on Railway only |

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
| `SUPABASE_URL` | FE production env writer (public project URL) |
| `SUPABASE_ANON_KEY` | FE production env writer (anon key only) |

Path filters (see `deploy.yml`): API also watches `libs/api/**`, `libs/shared/**`, lockfile/Nx config, `railway.toml`. FE watches `apps/baza-frontend/**`, `libs/baza/**`, `libs/shared/**`, lockfile/Nx config. Shared-lib or root package changes redeploy both.

FE build injects Supabase anon via `scripts/write-fe-production-env.mjs` (overwrites `environment.production.ts` in the runner only — committed file stays empty placeholders).

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
- Drop Supabase project / rotate service-role
- Delete R2 bucket or account API tokens
- Custom DNS

## Out of scope / next plan

**Not in this deploy:** company registry form (FR-001), Auth UI, Postgres schema migrations, R2 upload implementation.

**Next plan (separate):** prosty formularz rejestracji firm + (opcjonalnie) upload zdjęcia przez R2 używając już podpiętych env.
