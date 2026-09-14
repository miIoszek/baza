---
date: 2026-09-14T15:39:37+02:00
researcher: Cursor agent
git_commit: 84f44d463383a5e7701d8c11eee686d3df3031d0
branch: main
repository: baza
topic: "Add Sentry to Nest API + Angular FE (releases, source maps, CI, swallowed-error visibility)"
tags: [research, codebase, sentry, nestjs, angular, railway, cloudflare-pages, observability]
status: complete
last_updated: 2026-09-14
last_updated_by: Cursor agent
scope: api-and-frontend
depth: full
focus: [integration-points, deploy-secrets, swallowed-errors]
---

# Research: Add Sentry (API + Angular, full depth)

**Date**: 2026-09-14T15:39:37+02:00  
**Researcher**: Cursor agent  
**Git Commit**: [`84f44d463383a5e7701d8c11eee686d3df3031d0`](https://github.com/miIoszek/baza/commit/84f44d463383a5e7701d8c11eee686d3df3031d0)  
**Branch**: main  
**Repository**: [miIoszek/baza](https://github.com/miIoszek/baza)

## Research Question

How should Baza integrate Sentry for **both Nest API (Railway) and Angular SPA (Cloudflare Pages)**, at **full depth** (SDK + source maps + releases + CI upload + MCP readiness), covering:

1. Code integration points  
2. Deploy / secrets injection patterns  
3. Swallowed-error / warn patterns that monitoring must still see  

Scope chosen by user: API + FE; depth full; focus 1+2+3. Context: optional M3L5 task after fixing a swallowed error in `getCompanyForUser` (local uncommitted fix on top of this commit).

## Summary

Sentry is **not present** in dependencies or workflows. Observability today is Nest `Logger` + `AllExceptionsFilter` (logs **status ≥ 500 only**). Roadmap still parks “deep observability,” but change `add-sentry` intentionally unparks it.

**API:** Clear hooks in [`main.ts`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-api/src/main.ts) (dotenv → bootstrap) and [`AllExceptionsFilter`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/libs/api/core/src/lib/all-exceptions.filter.ts). Runtime DSN belongs on **Railway Variables**. Webpack already emits `sourceMap: true`; upload is awkward because deploy is `railway up` (build on Railway, not Actions).

**FE:** Hooks in [`main.ts`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-frontend/src/main.ts) / [`app.config.ts`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-frontend/src/app/app.config.ts). Public DSN fits existing bake path: GitHub Secret → [`write-fe-production-env.mjs`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/scripts/write-fe-production-env.mjs) → `environment.production.ts`. **Production source maps are off** — must enable (prefer hidden) + upload in `deploy-frontend` with `SENTRY_AUTH_TOKEN`. Most HTTP failures are caught in pages and never hit a global handler.

**Swallowed errors:** API `getCompanyForUser` is fixed locally (throw 500). Highest remaining twin is FE [`AuthService.refreshMe`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-frontend/src/app/core/auth.service.ts#L93-L101) (`catch` → `meSignal.set(null)`). Best-effort R2/register cleanup should be warning events, not ignored.

**Recommended packaging:** two Sentry projects (`baza-api`, `baza-frontend`); shared release name = `GITHUB_SHA` when both deploy; empty/missing DSN → SDK no-op.

## Detailed Findings

### Nest API — integration points

| Piece | Role for Sentry |
|-------|-----------------|
| [`apps/baza-api/src/main.ts`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-api/src/main.ts) | Init after `dotenv`, before/around `NestFactory.create`; bootstrap `.catch` already logs + `process.exit(1)` |
| [`libs/api/core/src/lib/configure-app.ts`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/libs/api/core/src/lib/configure-app.ts) | Registers global `AllExceptionsFilter` |
| [`libs/api/core/src/lib/all-exceptions.filter.ts`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/libs/api/core/src/lib/all-exceptions.filter.ts#L52-L54) | Today logs only `status >= 500`; natural place to `Sentry.captureException` for 5xx (and decide policy for 4xx-as-infra) |
| No ConfigModule | DSN via `process.env['SENTRY_DSN']` matches existing env style |
| No global interceptors | Request tracing would be net-new (`@sentry/nestjs` or manual) |

**Status-code skew:** many Supabase/R2 failures are mapped to `BadRequestException` (400). Filter-only 5xx capture **under-reports** infra failures unless services also use `captureException` / console integration on `logger.warn` before throw, or policy expands.

Suggested packages: `@sentry/nestjs` (or `@sentry/node`) — not Astro/Cloudflare from the course sample.

### Angular FE — integration points

| Piece | Role for Sentry |
|-------|-----------------|
| [`apps/baza-frontend/src/main.ts`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-frontend/src/main.ts) | `Sentry.init` before `bootstrapApplication` |
| [`apps/baza-frontend/src/app/app.config.ts`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-frontend/src/app/app.config.ts) | Custom `ErrorHandler` / TraceService; already has `provideBrowserGlobalErrorListeners()` only |
| [`auth.interceptor.ts`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-frontend/src/app/core/auth.interceptor.ts) | Bearer only; token failure → continue without auth — candidate for breadcrumbs |
| Env model | [`environment.model.ts`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-frontend/src/environments/environment.model.ts) — add public `sentryDsn` (like anon key) |
| Prod maps | [`project.json`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-frontend/project.json) — `sourceMap` only on development; production needs `true` or hidden maps |

Page-local `catchError` / snackbars mean **uncaught ErrorHandler alone is insufficient** for API failures — need HTTP error interceptor (filter expected 401/validation 4xx) and/or explicit capture at high-value catch sites.

Suggested package: `@sentry/angular`.

### Deploy, secrets, releases, source maps

| Concern | Pattern today | Sentry addition |
|---------|---------------|-----------------|
| API deploy | [`deploy.yml`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/.github/workflows/deploy.yml) `railway up` — no Actions build | `SENTRY_DSN` on **Railway**; map upload via Sentry webpack plugin during Railway `build:api`, or separate Actions build+upload |
| FE deploy | Secrets → `write-fe-production-env.mjs` → `nx build` → wrangler Pages | Add `SENTRY_DSN` (public) to writer; `SENTRY_AUTH_TOKEN` (+ org/project) in Actions for sourcemaps upload **after** build; delete maps before Pages deploy if not hidden |
| CI verify | No secrets ([`ci.yml`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/.github/workflows/ci.yml)) | Do **not** put release upload in CI |
| Naming | SCREAMING_SNAKE in [`.env.example`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/.env.example) | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, optional `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_ENVIRONMENT` |
| Path filters | API/FE may deploy alone | Release may exist for one app per commit — acceptable |
| API maps | [`webpack.config.js`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-api/webpack.config.js) `sourceMap: true` | Already available at Railway build |

**Never** bake `SENTRY_AUTH_TOKEN` into FE or Pages.

### Swallowed errors & monitoring design

#### Fixed locally (uncommitted on this research commit)

`AuthService.getCompanyForUser` — warn + `InternalServerErrorException` instead of `return null` (working tree). Spec asserts propagation. At commit `84f44d4` HEAD may still return null until committed.

#### High (false success / wrong UX)

| Location | Pattern |
|----------|---------|
| FE [`auth.service.ts:93-101`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-frontend/src/app/core/auth.service.ts#L93-L101) | `refreshMe` catch → `meSignal.set(null)` — twin of API swallow |
| FE [`company-public-profile.ts:47-56`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-frontend/src/app/pages/companies/company-public-profile.ts) | Any profile error → notFound |
| FE [`job-offer-detail-page.ts:143-152`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/apps/baza-frontend/src/app/pages/job-offers/job-offer-detail-page.ts) | Non-404 load errors → notFound |

#### Medium

- FE `init` / `getAccessToken` / auth interceptor token `catchError` → guest-shaped behavior  
- API `supabase-auth.service.ts` getUser error → `null` → 401  
- List pages `catchError` → `[]` + UI error (capture in catch if desired)

#### Low / intentional (breadcrumb or warning only)

- Register compensation cleanup (`auth.service.ts`)  
- R2 `deletePrefixInBucket` best-effort  
- Mid-stream R2 body errors after headers sent  
- Map basemap degrade  

**captureConsoleIntegration** (lesson pattern): useful for Nest `Logger.warn` on compensation/R2 if levels include warn — watch free-tier noise; prefer explicit `captureException`/`captureMessage` on high-value paths and filter 5xx in `AllExceptionsFilter`.

### Sentry MCP (agent diagnosis)

Course tooling (`@sentry/mcp-server`) is independent of app SDK. After production events exist: org access token + MCP for `search_issues` / issue detail. Not a deploy prerequisite; document in plan as post-setup agent workflow. Stack differs from wrangler tail — local equivalent remains `railway logs` / Pages logs per [`infrastructure.md`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/context/foundation/infrastructure.md).

## Code References

- `apps/baza-api/src/main.ts:6-38` — dotenv, bootstrap, fatal logger  
- `libs/api/core/src/lib/all-exceptions.filter.ts:12-61` — global filter, 5xx log only  
- `apps/baza-api/webpack.config.js` — API source maps on  
- `apps/baza-frontend/src/main.ts:1-6` — FE bootstrap  
- `apps/baza-frontend/src/app/app.config.ts` — no ErrorHandler  
- `apps/baza-frontend/project.json` — prod vs dev sourceMap  
- `scripts/write-fe-production-env.mjs` — FE secret bake  
- `.github/workflows/deploy.yml` — Railway + Pages path filters  
- `.env.example` — env naming conventions  

## Architecture Insights

1. **Split env worlds:** API = runtime Railway vars; FE = build-time bake. Mirror that for two DSNs.  
2. **Exception filter ≠ full observability:** 400-mapped infra + FE page catches leave blind spots without console/explicit capture + HTTP interceptor.  
3. **No-op without DSN:** keep local/CI green when secrets absent (lesson pattern).  
4. **Two Sentry projects** avoid mixing Node and browser noise; correlate by release SHA.  
5. Unparking roadmap item 182 is an explicit product decision for this change.

## Historical Context (from prior changes)

- [`context/foundation/roadmap.md`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/context/foundation/roadmap.md) — baseline Logger+filter; deep Sentry parked  
- [`context/foundation/infrastructure.md`](https://github.com/miIoszek/baza/blob/84f44d463383a5e7701d8c11eee686d3df3031d0/context/foundation/infrastructure.md) — logs via Railway/Wrangler, no APM  
- `context/archive/.../backend-error-handling.md` — deferred unified error DTO (orthogonal)  
- `context/archive/.../register-debt-closure` — “observability” meant compensation logs, not Sentry  
- `context/changes/add-sentry/change.md` — this change seed  

## Related Research

- `context/archive/2026-09-14-testing-critical-marketplace-loop/research.md` — marketplace loop tests (not monitoring)  
- No prior Sentry-specific research artifacts  

## Open Questions

1. Prefer `@sentry/nestjs` wrapper vs manual `@sentry/node` init in `main.ts`?  
2. API source-map upload: webpack plugin on Railway vs duplicate Actions build?  
3. Should plan include fixing FE `refreshMe` swallow in the same change, or only instrument it?  
4. Capture policy for expected 4xx (validation) vs 4xx-that-are-really-infra?  
5. Free-tier: enable `captureConsoleIntegration` for warn, or error-only + explicit captures?  
6. Update `roadmap.md` parked item when implementing?

## Suggested plan phases (input for `/10x-plan`)

1. Org/projects + env contracts (`.env.example`, Railway, GH secrets, FE writer)  
2. API SDK + filter capture + no-op without DSN  
3. FE SDK + ErrorHandler + optional HTTP interceptor  
4. Prod source maps (FE) + release upload in deploy-frontend; API maps via chosen path  
5. Instrument or fix high swallowed paths (`refreshMe`; optional notFound masking)  
6. Docs: agent MCP + `railway logs` verification checklist; unpark roadmap note  
