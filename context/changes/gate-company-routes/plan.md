# Gate Company Routes (F-01) Implementation Plan

## Overview

Add the minimum auth gating infrastructure so company-only frontend paths and API endpoints require a valid Supabase session. This is roadmap foundation F-01: it does not implement profile editing or inbox features (those are S-01 and S-05), but it creates the protected route tree and API namespace downstream slices will extend.

## Current State Analysis

**Frontend (`apps/baza-frontend`):**
- `AuthService` holds Supabase session, exposes `isLoggedIn`, `init()` runs on app boot (`app.ts:15-17`).
- Routes are only `''`, `login`, `register` (`app.routes.ts:6-11`) — no company area.
- Login always navigates to `/` after success (`login.ts:60`) — no `returnUrl`.
- No `canActivate` guards anywhere.

**Backend (`apps/baza-api`):**
- `JwtAuthGuard` validates Bearer token via `SupabaseAuthService.getUserFromAccessToken` (`jwt-auth.guard.ts:17-35`).
- Guard applied only on `GET /api/auth/me` (`auth.controller.ts:59-60`).
- `AuthModule` exports `JwtAuthGuard` and `AuthService` (`auth.module.ts:11-12`).
- No `/api/company/*` routes yet.

**Roadmap expectation (`context/foundation/roadmap.md` F-01):**
- Outcome: anonymous users cannot reach employer dashboard, profile edit, or inbox paths.
- Unlocks: S-01, S-02, S-05.

### Key Discoveries

- Session + interceptor pattern is already production-ready from archived `auth-supabase-session` work.
- `AuthMeResponse` in `@baza/shared-types` is the right contract for a company session probe (`libs/shared/types/src/lib/auth.ts`).
- AppShell navbar has no company-area links yet — acceptable; stubs can be reached by URL until S-01 adds navigation.

## Desired End State

After this change:

1. **FE:** `/company/profile` and `/company/inbox` exist as placeholder pages behind `companyAuthGuard`. Unauthenticated navigation redirects to `/login?returnUrl=<encoded-target>`. After login, user returns to intended URL (default `/company/profile`).
2. **FE:** Authenticated users visiting `/login` or `/register` redirect to `/company/profile`.
3. **API:** `GET /api/company/session` lives under a `CompanyController` with class-level `JwtAuthGuard`, returns `AuthMeResponse`, 401 without token.
4. **Tests:** Automated coverage for guard behavior (API + FE) and company controller auth.

### Verification

- Manual: open `/company/profile` logged out → login → see placeholder profile page.
- Manual: `curl` company session without/with Bearer token.
- Automated: `npm run lint`, `npm run test`, `npm run build`.

## What We're NOT Doing

- Company profile edit form or public profile page (S-01 `company-public-profile`).
- Application inbox UI or persistence (S-05 `company-application-inbox`).
- Job Offers public browse routes (S-03) — remain unguarded when added later.
- New auth provider, OAuth, or role model.
- Navbar redesign or deep linking beyond `returnUrl`.

## Implementation Approach

Vertical foundation in three phases: frontend guards and routes first (user-visible proof), then API namespace (pattern for Nest company features), then tests. Reuse existing `JwtAuthGuard` and `AuthService` — no new auth mechanism.

## Critical Implementation Details

**Guard vs `auth.init()` race:** `App.ngOnInit` calls `void auth.init()`. The company guard must not treat “session not loaded yet” as logged out. Export an `AuthService.whenReady()` (or await `init()` idempotently inside the guard) before reading `isLoggedIn()`.

---

## Phase 1: Frontend guards and company route shell

### Overview

Introduce functional route guards and a `/company` route tree with placeholder child pages. Wire login to honor `returnUrl`.

### Changes Required

#### 1. Auth readiness helper

**File:** `apps/baza-frontend/src/app/core/auth.service.ts`

**Intent:** Ensure guards wait for Supabase session hydration before deciding logged-in state.

**Contract:** Public `whenReady(): Promise<void>` that resolves after first `init()` completes (reuse existing `initialized` flag).

#### 2. Company auth guard

**File:** `apps/baza-frontend/src/app/core/guards/company-auth.guard.ts` (new)

**Intent:** Block anonymous access to company routes; preserve intended destination for post-login redirect.

**Contract:** `CanActivateFn` — await `auth.whenReady()`; if `!auth.isLoggedIn()`, `Router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })`; else `true`.

#### 3. Guest auth guard

**File:** `apps/baza-frontend/src/app/core/guards/guest-auth.guard.ts` (new)

**Intent:** Prevent logged-in companies from seeing login/register again.

**Contract:** `CanActivateFn` — if logged in after `whenReady()`, redirect to `/company/profile`; else `true`.

#### 4. Placeholder company pages

**Files:**
- `apps/baza-frontend/src/app/pages/company/company-profile-placeholder.ts` (new)
- `apps/baza-frontend/src/app/pages/company/company-inbox-placeholder.ts` (new)

**Intent:** Minimal standalone components proving gated routes render (Polish copy, e.g. “Profil firmy — wkrótce” / “Skrzynka aplikacji — wkrótce”). S-01/S-05 replace these files or swap components in routes.

**Contract:** Standalone components; no API calls beyond optional session display.

#### 5. Route table

**File:** `apps/baza-frontend/src/app/app.routes.ts`

**Intent:** Register company area and apply guards.

**Contract:**
- `{ path: 'company/profile', canActivate: [companyAuthGuard], component: CompanyProfilePlaceholder }`
- `{ path: 'company/inbox', canActivate: [companyAuthGuard], component: CompanyInboxPlaceholder }`
- `{ path: 'login', canActivate: [guestAuthGuard], ... }`
- `{ path: 'register', canActivate: [guestAuthGuard], ... }`
- Optional: `{ path: 'company', pathMatch: 'full', redirectTo: 'company/profile' }`

#### 6. Login returnUrl

**File:** `apps/baza-frontend/src/app/pages/login/login.ts`

**Intent:** After successful login, navigate to safe internal `returnUrl` or default `/company/profile`.

**Contract:** Read `returnUrl` from `ActivatedRoute.snapshot.queryParamMap`; validate it is a same-app relative path starting with `/` and not `//`; fallback `/company/profile`.

#### 7. Register post-success navigation (optional alignment)

**File:** `apps/baza-frontend/src/app/pages/register/register.ts`

**Intent:** After register + auto sign-in, land on `/company/profile` instead of home (aligns with FR-001 “land on profile” intent for S-01).

**Contract:** Replace post-success `navigateByUrl('/')` with `/company/profile` if present in current register flow.

### Success Criteria

#### Automated Verification

- `npx nx test baza-frontend` passes (including new guard tests from Phase 3 if added incrementally).
- `npm run lint` passes.

#### Manual Verification

- Logged out: visit `/company/profile` → redirected to `/login?returnUrl=...` → login → profile placeholder visible.
- Logged out: visit `/company/inbox` → same behavior with inbox as return target.
- Logged in: visit `/login` → redirected to `/company/profile`.

**Implementation Note:** Pause for human manual confirmation before Phase 2.

---

## Phase 2: API company namespace

### Overview

Add `CompanyModule` with class-level JWT protection as the template for all future company endpoints (profile CRUD, offers, inbox).

### Changes Required

#### 1. Company controller

**Files:**
- `apps/baza-api/src/app/company/company.controller.ts` (new)
- `apps/baza-api/src/app/company/company.module.ts` (new)

**Intent:** Establish guarded `/api/company/*` namespace with one session probe endpoint.

**Contract:**
- `@Controller('company')` + `@UseGuards(JwtAuthGuard)` at class level.
- `GET session` → `AuthMeResponse` (same shape as `/api/auth/me`), using `req.user` from guard + `AuthService.getCompanyForUser`.

#### 2. Wire module

**File:** `apps/baza-api/src/app/app.module.ts`

**Intent:** Register company routes in the app.

**Contract:** Import `CompanyModule` alongside `AuthModule`.

### Success Criteria

#### Automated Verification

- `npx nx test baza-api` passes.
- `npm run lint` passes.

#### Manual Verification

- `curl -i /api/company/session` without Authorization → 401.
- `curl -i /api/company/session` with valid Bearer from logged-in FE → 200 JSON with `user` + `company`.

**Implementation Note:** Pause for human manual confirmation before Phase 3.

---

## Phase 3: Automated tests and CI verification

### Overview

Lock guard and controller behavior with unit tests; run full monorepo verification.

### Changes Required

#### 1. API guard/controller tests

**Files:**
- `apps/baza-api/src/app/company/company.controller.spec.ts` (new)
- Optionally extend `apps/baza-api/src/app/auth/jwt-auth.guard.spec.ts` if shared guard tests are extracted

**Intent:** Prove `GET /api/company/session` returns 401 without user and 200 with mocked guard user + company.

**Contract:** Jest + Nest testing module; mock `AuthService.getCompanyForUser`.

#### 2. Frontend guard tests

**File:** `apps/baza-frontend/src/app/core/guards/company-auth.guard.spec.ts` (new)

**Intent:** Verify redirect to login with `returnUrl` when logged out, allow when logged in.

**Contract:** `TestBed` + `RouterTestingModule`; mock `AuthService.whenReady` and `isLoggedIn`.

#### 3. Route registration smoke

**File:** `apps/baza-frontend/src/app/app.spec.ts` (update if needed)

**Intent:** Ensure app still bootstraps with expanded route table.

**Contract:** Existing tests pass; add assertion that company routes are registered (optional router config parse).

### Success Criteria

#### Automated Verification

- `npm run lint` passes.
- `npm run test` passes (both apps).
- `npm run build` passes.

#### Manual Verification

- Quick browser smoke: home still loads health line; company gating from Phase 1 still works after API phase.

---

## Testing Strategy

### Unit Tests

- `companyAuthGuard`: logged out → UrlTree to login with returnUrl; logged in → true.
- `guestAuthGuard`: logged in → redirect profile; logged out → true.
- `CompanyController`: unauthorized request blocked by guard; authorized returns `AuthMeResponse`.

### Integration Tests

- None required for this foundation (guard already integration-tested indirectly via `/me` pattern).

### Manual Testing Steps

1. Register a new company (or use existing credentials).
2. Confirm `/company/profile` and `/company/inbox` show placeholders when logged in.
3. Sign out; confirm both URLs redirect to login.
4. Sign in from redirect; confirm return to original URL.
5. While logged in, open `/login` — confirm redirect to profile placeholder.

## Performance Considerations

Negligible — one extra await on guard first navigation; session probe endpoint mirrors existing `/me` cost.

## Migration Notes

Not applicable — no schema changes.

## References

- Roadmap F-01: `context/foundation/roadmap.md`
- PRD Access Control: `context/foundation/prd.md`
- Prior auth work: `context/archive/2026-09-04-auth-supabase-session/`
- Shared contract: `libs/shared/types/src/lib/auth.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Frontend guards and company route shell

#### Automated

- [x] 1.1 `npm run lint` passes after Phase 1 changes — 104c576
- [x] 1.2 `npx nx test baza-frontend` passes after Phase 1 changes — 104c576

#### Manual

- [ ] 1.3 Logged-out `/company/profile` and `/company/inbox` redirect to login with returnUrl; successful login returns to target
- [ ] 1.4 Logged-in user visiting `/login` or `/register` redirects to `/company/profile`

### Phase 2: API company namespace

#### Automated

- [x] 2.1 `npm run lint` passes after Phase 2 changes
- [x] 2.2 `npx nx test baza-api` passes after Phase 2 changes

#### Manual

- [ ] 2.3 `GET /api/company/session` returns 401 without Bearer and 200 with valid token

### Phase 3: Automated tests and CI verification

#### Automated

- [x] 3.1 `npm run lint` passes
- [x] 3.2 `npm run test` passes (both apps)
- [x] 3.3 `npm run build` passes

#### Manual

- [ ] 3.4 Browser smoke — home health line OK; company gating still works end-to-end
