# Add Sentry Error Monitoring — Plan Brief

> Full plan: `context/changes/add-sentry/plan.md`  
> Research: `context/changes/add-sentry/research.md`

## What & Why

Add production error monitoring with Sentry on both the Nest API (Railway) and Angular SPA (Cloudflare Pages). Completes the optional M3L5 path: proactive tests miss some failures; monitoring + fixing swallowed errors closes the gap.

## Starting Point

No Sentry today — Nest `Logger` + filter logs only HTTP ≥500. FE catches most API errors in pages. Env is split (Railway runtime vs Actions bake). Research mapped hooks, deploy injection, and high swallowed paths (`refreshMe`; API `getCompanyForUser` already fixed locally).

## Desired End State

With DSNs set, 5xx and chosen high-value failures appear in two Sentry projects with usable stacks (source maps uploaded). Without DSNs, local/CI stay no-op green. `refreshMe` no longer lies “no company” on `/auth/me` failure.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Scope | API + FE, full depth | User research scope | Research |
| API SDK | `@sentry/nestjs` | Nest-native hooks | Plan |
| API maps | Webpack plugin on Railway `build:api` | Maps already built there | Plan |
| Capture policy | 5xx + explicit high paths only | Protect free-tier quota | Plan |
| Console warn integration | No — error-level explicit only | Avoid noise | Plan |
| FE swallow | Fix `refreshMe` + capture | Twin of API M3L5 bug | Plan |
| FE HTTP | Interceptor for 5xx/network | Page catches hide errors from ErrorHandler | Plan |
| notFound masking | Out of scope | Keep FE PR bounded | Plan |
| Projects | `baza-api` + `baza-frontend`, release = git SHA | Clean streams, correlate deploys | Research |

## Scope

**In scope:** Env contracts, API+FE SDKs, filter/interceptor, explicit captures, `refreshMe` fix, FE hidden maps + Actions upload, API maps on Railway, docs/roadmap/MCP note.

**Out of scope:** Blanket 4xx capture, warn console integration, notFound→404 UX fixes, metrics dashboards, Astro/Cloudflare lesson SDK, CI release upload.

## Architecture / Approach

Two DSNs in two env worlds → two Sentry projects. Init no-ops without DSN. API: init in `main.ts`, capture in `AllExceptionsFilter` (≥500), webpack plugin for maps. FE: init + ErrorHandler + HTTP interceptor; bake `sentryDsn` like Supabase anon; upload maps in `deploy-frontend` then Pages without public maps.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Env & contracts | Names, writer, secret checklist | Wrong secret placement (token in FE) |
| 2. API SDK + maps | Nest Sentry, 5xx, Railway upload | Railway auth/env for plugin |
| 3. FE SDK + maps | Angular Sentry, interceptor, Actions upload | Maps shipped publicly if cleanup skipped |
| 4. Fix `refreshMe` | Honest failure UX + event | Session edge cases (401 vs 5xx) |
| 5. Docs & roadmap | Checklist, unpark note, MCP | Skipped if treated as optional forever |

**Prerequisites:** Sentry Developer org; ability to set Railway vars + GitHub Actions secrets.  
**Estimated effort:** ~2–3 sessions across 5 phases (secrets + first prod verify may wait on human).

## Open Risks & Assumptions

- Railway exposes a usable commit SHA for `SENTRY_RELEASE` (document actual var name at implement time).
- Free-tier 5k events/month is enough if we stay on 5xx + explicit.
- Path-filtered deploys may create a release for only one app per commit — acceptable.

## Success Criteria (Summary)

- Deliberate API 500 and FE 5xx show up in the right Sentry projects with readable stacks after deploy.
- Local/CI work without any Sentry secrets.
- `/auth/me` failure no longer looks like “company: null” success.
