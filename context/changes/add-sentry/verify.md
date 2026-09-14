# Verify: add-sentry

Post-wire checklist for humans and agents. Plan: `[plan.md](./plan.md)`. Research: `[research.md](./research.md)`. Secrets live in Railway / GitHub Actions / local `.env` only — never commit DSNs or auth tokens.

Two Sentry projects: `baza-api` (Nest / Railway) and `baza-frontend` (Angular / Pages). Env inventory: `context/deployment/deploy-plan.md`.

## Local (no deploy)

- [x] API without `SENTRY_DSN` boots; no crash on `/api/health`. *(re-checked 2026-09-14: DSN empty, health ok)*
- [x] API with DSN: force a 500 → issue in `baza-api`; cross-check `railway logs` / local Nest stdout. *(earlier: [BAZA-API-1](https://milosz.sentry.io/issues/BAZA-API-1); current `.env` DSN empty again — re-smoke needs DSN filled + API restart)*
- [x] FE without DSN: `nx serve` / production build OK. *(re-checked: `sentryDsn` empty, :4200 → 200)*
- [x] FE with DSN: uncaught error or HTTP 5xx → issue in `baza-frontend`. *(earlier: [BAZA-FRONTEND-1](https://milosz.sentry.io/issues/BAZA-FRONTEND-1); current local DSN empty)*
- [x] Break `/api/auth/me` while logged in → UI shows load error (not “brak profilu firmy”); FE and/or API issue present. *(confirmed in-session; FE events e.g. [BAZA-FRONTEND-2](https://milosz.sentry.io/issues/BAZA-FRONTEND-2))*



## Production (after merge + secrets)

- [ ] Railway has `SENTRY_DSN` (+ optional `SENTRY_ENVIRONMENT=production`); redeploy API.
- [ ] GitHub Actions FE job has public `SENTRY_DSN` for `baza-frontend`.
- [ ] Optional maps: `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` (+ project) on Railway build and FE Actions; release ≈ git SHA.
- [ ] Hit a known 500 on API → issue in `baza-api` with usable stack (maps if token set).
- [ ] Hit FE 5xx / uncaught → issue in `baza-frontend`.
- [ ] Cloudflare Pages does **not** serve public `*.map` (upload step deletes maps after Sentry CLI upload when token present).
- [ ] `railway logs` still shows the same failure (multi-layer: Sentry + host logs).



## Optional agent / MCP

Cursor can use Sentry MCP (`mcp.sentry.dev`) with org access to `search_issues` / `search_events` while debugging. MCP is **not** required to merge or ship; Dashboard UI is enough for the course path.