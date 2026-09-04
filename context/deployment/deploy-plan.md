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
| Supabase | Env vars on Railway (user-wired) | Project keys present on API service; no Auth code yet |

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
| `SUPABASE_URL` | Railway | Wired by user (values not stored in this file) |
| `SUPABASE_ANON_KEY` | Railway | Wired by user |
| `SUPABASE_SERVICE_ROLE_KEY` | Railway | Wired by user — **never** on Pages |
| `R2_ACCOUNT_ID` | Railway | Wired by user |
| `R2_ACCESS_KEY_ID` | Railway | Wired by user |
| `R2_SECRET_ACCESS_KEY` | Railway | Wired by user |
| `R2_BUCKET` | Railway | Expect `baza-uploads` |
| `R2_PUBLIC_URL` | Railway | Optional / as configured |
| Supabase anon on Pages | Pages | **Pending** until Auth FE (next product plan) |
| R2 SDK / upload routes in Nest | Code | **Pending** — next plan (registry photo) |

## Redeploy cheat-sheet

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
