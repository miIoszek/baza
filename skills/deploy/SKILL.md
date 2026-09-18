---
name: deploy
description: Deploy Baza (API + Postgres on Railway, frontend on Cloudflare Pages). Only the user can trigger this skill.
disable-model-invocation: true
---

Deploy Baza to production.

Normal path: merge to `main`. `.github/workflows/deploy.yml` deploys path-filtered: API →
Railway (`railway up --service=baza-api`), frontend → Cloudflare Pages (`wrangler pages deploy`
from `apps/baza-frontend`, which also ships the `/api` proxy Function). CI (`ci.yml`) must be green.

Manual path (only if the user asks):

1. Confirm the user intends to deploy to production (ask explicitly if not stated).
2. Run `npm run lint && npm run test && npm run build` and surface any errors first. The API tests need
   `TEST_DATABASE_URL` (a scratch Postgres).
3. API: `railway up --service=baza-api --ci` (requires `railway login`, project `baza`).
   Migrations run at API boot; watch `railway logs` for `Applied N migration(s)`.
4. Frontend: `npm run build:frontend:ci`, then from `apps/baza-frontend`:
   `npx wrangler pages deploy ../../dist/apps/baza-frontend/browser --project-name=baza-app`.
5. Smoke test: `GET /api/health`, then register/login on the live site.

Before deploying, check the environment (never print secret values):

- Railway `baza-api`: `DATABASE_URL`, `AUTH_JWT_SIGNING_KEYS`, `AUTH_WEB_BASE_URL`, `CORS_ORIGIN`,
  `PROXY_SHARED_SECRET`, R2 keys. Without them the API refuses to boot (by design).
- Cloudflare Pages project `baza-app`: `API_ORIGIN`, `PROXY_SHARED_SECRET` (same value as Railway).
- Auth details, key rotation and incident procedures: `.claude/skills/baza-auth`.
