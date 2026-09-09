---
project: Baza
version: 1
status: draft
created: 2026-09-08
updated: 2026-09-08
prd_version: 1
main_goal: speed
top_blocker: time
---


# Roadmap: Baza

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Transport companies lose drivers when job boards ignore route geography and home-return cadence. Baza matches offers on those two axes and shows routes on a map instead of a text-only list. The product wedge — the trait that, if removed, makes Baza just another job board — is route + home-cadence matching with map visualization for both browse and apply.

## North star

**S-05: Company receives driver application in inbox** — When a company sees a driver's application in their inbox after the driver filtered offers, opened route visualization, and applied without an account, the full marketplace loop from US-01 is proven under real conditions.

> North star here means the smallest end-to-end slice whose successful delivery would prove the core product hypothesis — placed as early as prerequisites allow because everything else only matters if this works.

## At a glance

| ID   | Change ID               | Outcome (user can …)                                              | Prerequisites | PRD refs              | Status   |
| ---- | ----------------------- | ----------------------------------------------------------------- | ------------- | --------------------- | -------- |
| F-01 | gate-company-routes     | (foundation) Company-only routes and API paths require login      | —             | Access Control        | done     |
| S-01 | company-public-profile  | View and edit public company profile after registration           | F-01          | FR-001, FR-002        | in-progress |
| S-02 | publish-job-offer       | Publish a free offer; see it on profile, Job Offers list, map pin | S-01          | FR-003, FR-004, US-01 | proposed |
| S-03 | driver-browse-job-offers  | Open Job Offers without account; filter by route and home cadence | S-02          | FR-006, FR-007, US-01 | proposed |
| S-04 | driver-apply-via-map      | Open offer detail with route map; apply with email, phone, CV     | S-03          | FR-008, FR-009, US-01 | proposed |
| S-05 | company-application-inbox | See driver applications in employer inbox                         | S-04, F-01    | FR-005, US-01         | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below.

| Stream | Theme            | Chain                                      | Note                                                                 |
| ------ | ---------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| A      | Company supply   | `F-01` → `S-01` → `S-02`                   | Unblocks public offers; sequenced first under `main_goal: speed`.    |
| B      | Marketplace loop | `S-02` → `S-03` → `S-04` → `S-05`          | North star `S-05` closes US-01; joins Stream A at `S-02`.            |

## Baseline

What's already in place in the codebase as of `2026-09-08` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Angular 22 SPA with Material, `@baza/ui`, routes for home/login/register (`apps/baza-frontend/src/app/app.routes.ts`).
- **Backend / API:** present — NestJS with global prefix `api`; `GET /api/health`, `POST /api/auth/register`, `GET /api/auth/me` (`apps/baza-api/src/app/auth/auth.controller.ts`).
- **Data:** partial — Supabase Postgres migration for `companies` only (`supabase/migrations/20260904120000_create_companies.sql`); no `offers` or `applications` tables yet.
- **Auth:** present — Supabase Auth on FE + API; JWT on `/api/auth/me` and `/api/company/*`; Angular `companyAuthGuard` on employer routes (F-01); company register + R2 photo path live.
- **Deploy / infra:** partial — CI (`/.github/workflows/ci.yml`) and deploy to Railway (API via `railway.toml` + Railpack) and Cloudflare Pages (FE via `deploy.yml`); production live per `context/deployment/deploy-plan.md`. No Dockerfile — not required (Railpack + Pages build/deploy without Docker).
- **Observability:** partial — Nest `Logger` and global exception filter; no Sentry, metrics, or structured logging.

## Foundations

### F-01: Gate company routes

- **Outcome:** (foundation) Company-only frontend routes and API endpoints require a valid Supabase session; anonymous users cannot reach employer dashboard, profile edit, or inbox paths.
- **Change ID:** gate-company-routes
- **PRD refs:** Access Control (companies: login required)
- **Unlocks:** S-01, S-02, S-05
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Auth scaffold exists but routes are open; gating now prevents shipping company features behind unprotected URLs and aligns FE with API before profile and inbox land.
- **Status:** done

## Slices

### S-01: Company public profile

- **Outcome:** User can view and edit their public company profile after registration, including landing on the profile flow post-signup.
- **Change ID:** company-public-profile
- **PRD refs:** FR-001, FR-002
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Register creates `companies` rows today but there is no profile page; this slice closes FR-002 and the "land on profile" gap in FR-001 before publish work starts.
- **Status:** in-progress
- **Progress note:** Phase 1 shipped (public `GET /api/companies/:id` + `/companies/:id`). Phase 2–3 (owner `PATCH` + edit UI at `/company/profile`) still open — page is still a placeholder.

### S-02: Publish job offer

- **Outcome:** User can create and publish a free job offer with route countries, home-return cadence, and requirements, and see it on their company profile and in Job Offers as a list entry and map pin at base location.
- **Change ID:** publish-job-offer
- **PRD refs:** FR-003, FR-004, US-01
- **Prerequisites:** S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Geocoding vs manual lat/lng for base map pin — Owner: user. Block: no.
- **Risk:** First slice that introduces `offers` persistence and public Job Offers surface; sequenced before driver browse because empty marketplace blocks meaningful filter validation.
- **Status:** proposed

### S-03: Driver browse Job Offers

- **Outcome:** User can open Job Offers without creating an account and filter offers by route countries/directions and home-return cadence, seeing matches in a list (mobile-first) and on a map where screen size allows.
- **Change ID:** driver-browse-job-offers
- **PRD refs:** FR-006, FR-007, US-01
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Driver license category as MVP filter vs deferred — Owner: user. Block: no.
- **Risk:** Exercises core matching UX (route + cadence filters) on real published data; list-first on small screens per NFR without blocking the must-have path.
- **Status:** proposed

### S-04: Driver apply via map

- **Outcome:** User can open a job offer and see job information plus route visualization on a map, then apply without an account by submitting email, phone, and CV.
- **Change ID:** driver-apply-via-map
- **PRD refs:** FR-008, FR-009, US-01
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Optional "message" field on apply form (FR-005 vs FR-009 wording) — Owner: user. Block: no.
  - Country-level route lines vs pin + country list for MVP map — Owner: user. Block: no.
- **Risk:** Highest integration risk in the driver path (map rendering + CV upload + GDPR-visible apply); sequenced after browse so filters and offer data are stable before detail/apply.
- **Status:** proposed

### S-05: Company application inbox

- **Outcome:** User can see driver applications in an employer dashboard/inbox with contact information and CV; only the receiving company can access that applicant's data.
- **Change ID:** company-application-inbox
- **PRD refs:** FR-005, US-01
- **Prerequisites:** S-04, F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** North star validation milestone — if inbox delivery fails, US-01 fails regardless of polish elsewhere; depends on applications persistence and company-scoped access from S-04.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID               | Suggested issue title                              | Ready for `/10x-plan` | Notes                                      |
| ---------- | ----------------------- | -------------------------------------------------- | --------------------- | ------------------------------------------ |
| F-01       | gate-company-routes     | Gate company routes behind login                   | — (done)              | Merged; archive when closing change folder |
| S-01       | company-public-profile  | Company public profile view and edit               | yes (resume)          | Finish Phase 2–3 edit path before S-02     |
| S-02       | publish-job-offer       | Publish job offer with map pin on Job Offers       | no                    | After S-01 done                            |
| S-03       | driver-browse-job-offers| Driver Job Offers browse and route/cadence filters | no                    | After S-02                                 |
| S-04       | driver-apply-via-map    | Driver apply with route map and CV upload          | no                    | After S-03                                 |
| S-05       | company-application-inbox | Company inbox for driver applications            | no                    | North star; after S-04                     |

## Open Roadmap Questions

1. **Hard deadline vs estimate** — Owner: user. Block: roadmap-wide planning risk (`hard_deadline: 2026-09-12` vs `mvp_weeks: 2`, after-hours). Resolve: move deadline, cut scope, or accept slip before over-committing downstream slices.
2. **Company login mechanism** — Owner: user / tech-stack. Block: no (email+password live; OAuth deferred).
3. **Application "message" field** — Owner: user. Block: no (gates copy/UX in S-04 only).
4. **Driver license category in MVP filters** — Owner: user. Block: no (gates S-03 filter set).
5. **Primary company role persona** — Owner: user. Block: no (copy/UX only).

## Parked

- **Payments / paid listings** — Why parked: PRD §Non-Goals; `main_goal: speed` keeps offers free.
- **Driver accounts and saved profiles** — Why parked: PRD §Non-Goals; apply-without-signup is the MVP loop.
- **Chat / messaging beyond apply form** — Why parked: PRD §Non-Goals.
- **Multi-language UI** — Why parked: PRD §Non-Goals (Polish only in MVP).
- **Map pin clustering / popup list** — Why parked: PRD §Non-Goals until offer density grows.
- **Deep observability (Sentry, metrics dashboards)** — Why parked: `main_goal: speed` + baseline logging sufficient for MVP; revisit if quality becomes the goal.
- **Dockerfile / container-local dev stack** — Why parked: deploy uses Railway Railpack + Cloudflare Pages without Docker; not required for MVP.

## Done

- **F-01** `gate-company-routes` — 2026-09-08 — Company FE routes + `/api/company/*` require session (PR #3). Formal `/10x-archive` still pending for the change folder.
