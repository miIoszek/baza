# Gate Company Routes — Plan Brief

> Full plan: `context/changes/gate-company-routes/plan.md`

## What & Why

Companies must be logged in to reach employer areas (PRD Access Control). Auth scaffold exists (Supabase session, JWT guard on `/api/auth/me`), but company routes are not defined and nothing stops anonymous access to future profile/inbox URLs. This foundation adds guarded `/company/*` routes and a guarded `/api/company/*` namespace before S-01 ships real profile UI.

## Starting Point

- FE: login/register/home public; `AuthService.isLoggedIn`; no `canActivate` guards; login always redirects to `/`.
- API: `JwtAuthGuard` on `GET /api/auth/me` only; `AuthModule` already exports guard.
- Roadmap item F-01, status `ready`.

## Desired End State

Anonymous user hitting `/company/profile` or `/company/inbox` is sent to `/login?returnUrl=…` and returns after login. Logged-in user hitting `/login` is redirected to `/company/profile`. `GET /api/company/session` returns 401 without Bearer token and 200 with valid token (class-level guard pattern for future company APIs). Placeholder pages prove routing only — S-01/S-05 replace them.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Company URL prefix | `/company/*` child routes | Groups employer UX; public Job Offers stay at `/` later | Plan |
| Unauthenticated UX | Redirect to `/login?returnUrl=` | Standard pattern; login page updated to honor param | Plan |
| Post-login default | `/company/profile` when no `returnUrl` | Matches roadmap S-01 landing intent | Roadmap |
| Placeholder pages | Minimal stub components for `profile` + `inbox` | F-01 needs paths to gate, not feature UI | Roadmap |
| API pattern | `CompanyModule` + class-level `JwtAuthGuard` | One guard for all future company endpoints | Plan |
| Session probe | `GET /api/company/session` → `AuthMeResponse` | Reuses `/me` shape; verifies guarded namespace | Plan |
| Guest guard | Redirect logged-in users away from `/login` and `/register` | Avoids confusing double-login | Plan |

## Scope

**In scope:** FE guards, company route tree, login `returnUrl`, API company controller scaffold, unit tests for guards/controller.

**Out of scope:** Profile edit UI (S-01), inbox UI (S-05), offer/public driver routes, roles beyond “has session”, OAuth, navbar link polish beyond what stubs need.

## Architecture / Approach

Angular functional guards read `AuthService` session (initialized in `App.ngOnInit`). Company routes lazy-load stub standalone components behind `companyAuthGuard`. Nest `CompanyController` applies `@UseGuards(JwtAuthGuard)` at class level; handler delegates to existing `AuthService.getCompanyForUser` for response body.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. FE guards + routes | `/company/profile`, `/company/inbox` gated; login returnUrl | Race if `auth.init()` not awaited before guard runs |
| 2. API company namespace | `GET /api/company/session` guarded | None — guard already proven on `/me` |
| 3. Tests + verify | Guard/controller specs; lint/test/build green | FE guard testing needs Router test harness |

**Prerequisites:** Supabase env wired locally; existing register/login flow working.

**Estimated effort:** ~1 focused session, 3 phases.

## Open Risks & Assumptions

- Assumes single company role (any logged-in user is a company account from register flow).
- `auth.init()` must complete before first navigation; guard should wait on init promise if session still loading.

## Success Criteria (Summary)

- Logged-out visit to `/company/profile` → login → lands back on profile.
- `GET /api/company/session` without token → 401; with valid Bearer → 200 + user/company payload.
- CI: lint, test, build pass.
