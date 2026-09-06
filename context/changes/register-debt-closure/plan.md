# Register Debt Closure Implementation Plan

## Overview

Close residual company-register integrity risk after the archived `auth-company-logo-r2` work: require Supabase credentials (including service role) before the Nest API boots, ensure register always uses the admin path so compensation can delete Auth users, treat non-throwing `deleteUser` errors as compensation failures (logged), and prove the path with focused unit tests. Do not re-implement Multer→400 or build a unified Nest error filter.

## Current State Analysis

- Frame brief (`frame.md`) established that the stale **REJECTED** review is mostly process; original F5 Multer→500 is already fixed via `BadRequestException` in `auth.controller.ts`; the real leftover is **residual Auth orphan risk** in compensation.
- `AuthService.register` still allows an anon `signUp` fallback when `SUPABASE_SERVICE_ROLE_KEY` is missing (`apps/baza-api/src/app/auth/auth.service.ts`), so mid-register failure can leave an Auth user that compensation cannot delete.
- `compensateFailedRegister` warns and returns when no admin client is available; `deleteUser` is called in try/catch but the supabase-js `{ error }` return is not checked.
- R2 cleanup on failure is best-effort via `deletePrefix`; photo upload already refuses register when R2 is missing.
- No `auth.service.spec.ts` (or other auth specs); only scaffold `app.*.spec.ts` exist.
- `.env.example` lists the three Supabase vars but does not say the API must refuse to start without them.
- Bootstrap (`apps/baza-api/src/main.ts`) loads dotenv then creates the app with no env gate.

## Desired End State

- Nest API **does not listen** unless `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are all non-empty after trim.
- Company register always creates users via admin `createUser` (anon signup fallback removed); compensation can always attempt `admin.deleteUser`.
- If `deleteUser` returns `{ error }` (or throws), compensation logs a clear failure; the client still receives the original register failure.
- Unit tests lock the fail-closed and compensation behaviors under mocks.
- Operators see in `.env.example` (and a short deploy note) that those three keys are required to run the API.

### Key Discoveries:

- Frame reframed problem: harden/verify compensation + proof; exclude F5 re-implementation and unified Nest error system unless explicitly requested (`context/changes/register-debt-closure/frame.md`).
- Compensation lives at `apps/baza-api/src/app/auth/auth.service.ts` (`compensateFailedRegister`); register catch always calls it then rethrows.
- `ServiceUnavailableException` is already used for missing R2-on-photo and missing anon config — same exception family fits boot/register fail-closed messaging.
- Jest: `npx nx test baza-api`; co-located `*.spec.ts`; no prior `jest.mock('@supabase/supabase-js')` pattern — invent minimal Nest + mock pattern in Phase 2.
- Boot validation belongs outside per-request code (e.g. `main.ts` / shared helper) so unit tests that do not call bootstrap stay independent of real secrets.

## What We're NOT Doing

- Re-implementing Multer `fileFilter` / original F5 (already `BadRequestException`).
- Unified Nest exception filter + error DTO (archived follow-up stays deferred).
- Rewriting the archived REJECTED impl-review verdict as a product deliverable (process optional later).
- Requiring Cloudflare R2 keys at boot (R2 remains optional until a photo is uploaded).
- Frontend changes, DB migrations, or product-slice work (`change-folder`).
- Live Supabase/R2 integration tests or production orphan cleanup scripts.

## Implementation Approach

1. Fail closed at **process bootstrap** for the three Supabase env vars (user decision: app must not run without them).
2. Simplify `register` to the admin-only path; keep compensation but make Auth delete reliable and observable when `deleteUser` fails via `{ error }`.
3. Add mocked unit tests for insert-failure → deleteUser (+ R2 when photo), and deleteUser `{ error }` logging behavior.
4. Document the boot requirement next to the env names operators already copy.

## Critical Implementation Details

### Timing & lifecycle

Validate Supabase env **before** `app.listen` (preferably before or immediately after `NestFactory.create`, still inside bootstrap). Do not put a hard throw only on `AuthService` construction — that couples unrelated providers and obscures boot failure. After boot validation, the anon signup branch in `register` is dead and should be removed so compensation assumptions hold.

### Debug & observability

When `deleteUser` fails (throw or `{ error }`), log at warn/error with `userId` and the error message under a stable phrasing (e.g. compensation / orphan cleanup failed). Do not change the HTTP status of the original register failure solely because cleanup failed.

## Phase 1: Fail-closed env + compensation harden

### Overview

Gate Nest API startup on required Supabase keys; remove the anon register fallback; ensure compensation checks `deleteUser` errors.

### Changes Required:

#### 1. Bootstrap env gate

**File**: `apps/baza-api/src/main.ts` (and optionally a small helper under `apps/baza-api/src/` or `@baza/api-core` if that keeps `main.ts` readable)

**Intent**: Refuse to start the API when any of `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` is missing/blank after trim, with a clear log/error naming the missing variable(s).

**Contract**: Process exits (or throws before listen) if any of the three required vars is absent; R2 vars are not part of this gate.

#### 2. Admin-only register + compensation

**File**: `apps/baza-api/src/app/auth/auth.service.ts`

**Intent**: After boot guarantees service role, register always uses admin `createUser` + admin DB client; drop the anon `signUp` / session-bearer branch. In `compensateFailedRegister`, inspect `deleteUser` result for `{ error }` (and existing throws) and log compensation failure without swallowing as success; still rethrow the original register error to the client.

**Contract**: No successful register path without service-role admin client. `compensateFailedRegister` must not treat a supabase-js error return as a clean delete. Defensive “no admin” branch may remain as a log+return last resort but should be unreachable after Phase 1 boot gate in normal process lifetime.

#### 3. Related auth client messaging (if still stale)

**File**: `apps/baza-api/src/app/auth/supabase-auth.service.ts`

**Intent**: Align “Supabase not configured” messaging with the new reality that service role is required for the API process (avoid documenting anon-only as sufficient for the Nest app).

**Contract**: JWT-scoped reads still work; messaging must not contradict the boot gate. Prefer minimal edit if behavior is already correct with service role present.

### Success Criteria:

#### Automated Verification:

- `npx nx build baza-api` succeeds
- `npx nx test baza-api` still passes existing specs (auth specs may land in Phase 2)
- Lint for touched API files is clean (`npx nx lint baza-api` if configured)

#### Manual Verification:

- With all three Supabase vars set, API starts and existing health/API route responds
- With `SUPABASE_SERVICE_ROLE_KEY` unset/empty, process fails to start and names the missing key (does not listen on the port)
- Spot-check: rejected MIME on register still returns 4xx (no F5 regression)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Unit tests for register compensation

### Overview

Add co-located Jest coverage that locks fail-closed register assumptions and compensation side effects under mocks (no live Supabase/R2).

### Changes Required:

#### 1. AuthService unit tests

**File**: `apps/baza-api/src/app/auth/auth.service.spec.ts` (new)

**Intent**: Prove that company-insert (or later-step) failure triggers Auth delete (and R2 `deletePrefix` when a photo key was set); prove `deleteUser` `{ error }` is treated as compensation failure (logged / not silent success); prove register does not use the old anon-only path.

**Contract**: Use `Test.createTestingModule` with mocked `R2StorageService` and `SupabaseAuthService`; mock `@supabase/supabase-js` `createClient`. Set/clear `process.env` Supabase keys in `beforeEach`/`afterEach`. Cover at least: (a) insert failure → `deleteUser` called with created user id; (b) photo path → `deletePrefix` also called; (c) `deleteUser` returning `{ error }` → logged failure path; (d) behavior when service role missing at register time matches Phase 1 contract (exception, no orphan create).

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-api` passes including new `auth.service.spec.ts`
- `npx nx build baza-api` succeeds

#### Manual Verification:

- Skim test names/descriptions: a reviewer can tell which orphan scenarios are locked without reading implementation

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before Phase 3.

---

## Phase 3: Operator docs for required keys

### Overview

Make the boot requirement obvious wherever operators copy env names.

### Changes Required:

#### 1. `.env.example`

**File**: `.env.example`

**Intent**: Comment that Nest API will not start without `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; keep reminding that service role never goes on the frontend.

**Contract**: Names only (no secrets); comment adjacent to the three Supabase lines.

#### 2. Deploy note (light touch)

**File**: `context/deployment/deploy-plan.md` (and/or root `README.md` if it already lists Railway API secrets)

**Intent**: One short note that API boot requires the service role key (not only for optional compensation).

**Contract**: Do not invent a new deployment guide; amend the existing Railway/env section only.

### Success Criteria:

#### Automated Verification:

- Diff review: no secret values committed; `.env.example` still names-only

#### Manual Verification:

- A new operator reading `.env.example` alone would know the API refuses to start without the three Supabase keys

**Implementation Note**: After this phase, the change is ready for `/10x-impl-review`.

---

## Testing Strategy

### Unit Tests:

- Insert failure after admin `createUser` → `deleteUser` invoked
- Photo uploaded then failure → `deletePrefix` + `deleteUser`
- `deleteUser` `{ error }` → compensation failure logged
- Missing service role / boot contract alignment (no anon fallback)

### Integration Tests:

- None in this change (no live Supabase project required)

### Manual Testing Steps:

1. Start API with complete `.env` — confirm listen + health
2. Unset service role, restart — confirm process does not listen
3. Optional: force a register failure after Auth create in a local project and confirm user is deleted when service role is set
4. Confirm invalid photo MIME still 400

## Performance Considerations

Negligible: one-time env checks at boot; compensation only on failure path.

## Migration Notes

- Local and Railway must set `SUPABASE_SERVICE_ROLE_KEY` before the API will start (breaking for any environment that previously ran anon-only).
- No DB migration.
- No cleanup job for historical orphans from prior anon-only failures (out of scope).

## References

- Frame: `context/changes/register-debt-closure/frame.md`
- Archive review: `context/archive/2026-09-04-auth-company-logo-r2/reviews/impl-review.md`
- Deferred error system: `context/archive/2026-09-04-auth-company-logo-r2/follow-ups/backend-error-handling.md`
- Deploy env notes: `context/deployment/deploy-plan.md`
- Code: `apps/baza-api/src/app/auth/auth.service.ts`, `apps/baza-api/src/main.ts`, `.env.example`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Fail-closed env + compensation harden

#### Automated

- [x] 1.1 `npx nx build baza-api` succeeds — ae36ba5
- [x] 1.2 `npx nx test baza-api` still passes existing specs (auth specs may land in Phase 2) — ae36ba5
- [x] 1.3 Lint for touched API files is clean (`npx nx lint baza-api` if configured) — ae36ba5

#### Manual

- [x] 1.4 With all three Supabase vars set, API starts and existing health/API route responds — ae36ba5
- [x] 1.5 With `SUPABASE_SERVICE_ROLE_KEY` unset/empty, process fails to start and names the missing key (does not listen on the port) — ae36ba5
- [x] 1.6 Spot-check: rejected MIME on register still returns 4xx (no F5 regression) — ae36ba5

### Phase 2: Unit tests for register compensation

#### Automated

- [ ] 2.1 `npx nx test baza-api` passes including new `auth.service.spec.ts`
- [ ] 2.2 `npx nx build baza-api` succeeds

#### Manual

- [ ] 2.3 Skim test names/descriptions: a reviewer can tell which orphan scenarios are locked without reading implementation

### Phase 3: Operator docs for required keys

#### Automated

- [ ] 3.1 Diff review: no secret values committed; `.env.example` still names-only

#### Manual

- [ ] 3.2 A new operator reading `.env.example` alone would know the API refuses to start without the three Supabase keys
