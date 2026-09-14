# Critical Marketplace Loop Tests — Implementation Plan

## Overview

Add **stateful service-level integration tests** for test-plan Risks **#1** (apply → company inbox) and **#2** (CV ownership isolation). Close the gap where CI passes even if the apply→list loop or cross-tenant CV authz regresses. Update `context/foundation/test-plan.md` cookbook once tests land.

## Current State Analysis

Product code already implements the full loop:

- Public apply: `POST /api/offers/:id/applications` → `JobApplicationService.applyToPublishedOffer` inserts `job_applications` with `company_id` from the published offer.
- Company inbox: JWT `GET /api/company/applications` → `listForOwner` filters `.eq('company_id', company.id)`.
- CV download: `getCvStreamForOwner` checks row ownership + `applications/{companyId}/` key prefix before `R2StorageService.getPrivateObject`.

**Test gap:** `job-application.service.spec.ts` mocks each call in isolation — apply insert return shape and list rows are unrelated. No test proves that an application created via apply appears on the owning company's list and not on another company's list. CV authz unit tests exist but are not chained with apply fixtures.

### Key Discoveries:

- `apps/baza-api/src/app/company/job-application.service.ts` — apply, list, CV stream; company scoping is server-derived from offer ownership.
- `apps/baza-api/src/app/company/job-application.service.spec.ts` — per-method mocks; `mockCompanyForUser` / `mockPublishedOffer` are call-order fragile, not stateful.
- No supertest or dedicated integration target in `apps/baza-api/jest.config.js`; Jest via `npx nx test baza-api` is the CI gate.
- Research recommends API integration; **planning decision:** stateful service integration (no new HTTP layer) for cost × signal in this repo.
- Wire DTOs in `libs/shared/types/src/lib/application.ts` omit `cvFileKey` by design.

## Desired End State

After this change:

1. A dedicated integration spec runs in `npx nx test baza-api` and proves **Risk #1**: after apply on company A's published offer, `listForOwner(user-A)` includes the new application id and contact fields; `listForOwner(user-B)` does not.
2. The same harness proves **Risk #2**: `getCvStreamForOwner(user-B, app-id-from-A)` returns 404 and does not call R2 get; apply/list responses never expose `cvFileKey` / `cv_file_key`.
3. `context/foundation/test-plan.md` §6.2 and §6.4 document the pattern; §3 Phase 1 row can move to `done` after merge.

**Verification:** `npm run lint && npx nx test baza-api` green locally and in CI.

## What We're NOT Doing

- Playwright or browser e2e (research + test-plan Phase 1 scope).
- Supertest / full HTTP multipart apply tests (deferred — stateful service layer chosen).
- Real Supabase test project or migrations in CI.
- Automated Cloudflare private-bucket ACL checks (ops/document-only per research).
- Frontend inbox/apply spec changes (API oracle is sufficient for Phase 1).
- New dedicated Nx `integration` target or extra CI job (existing `npm run test` gate).
- Risks #3–#6 (later rollout phases).

## Implementation Approach

Introduce a **stateful in-memory Supabase double** that routes `from('table')` queries to shared fixture state (companies, job_offers, job_applications). Wire it into a new integration describe block alongside existing unit tests.

Tests use **fixture membership oracle**: known company A/B ids, known offer ownership, expected application id on list — not re-asserting internal filter implementation strings as the sole proof.

Keep existing unit tests in `job-application.service.spec.ts` unchanged; add a sibling spec file for loop scenarios to avoid breaking call-order mocks.

## Phase 1: Stateful Supabase Test Harness

### Overview

Create a reusable in-memory store and Supabase client mock that supports the query chains `JobApplicationService` uses: offer lookup, company lookup, insert+select single, list with eq+order, CV lookup with double eq+maybeSingle.

### Changes Required:

#### 1. Integration test utilities

**File**: `apps/baza-api/src/testing/stateful-supabase.mock.ts` (new)

**Intent**: Provide an in-memory database and factory that returns a `getClient()`-compatible mock for `SupabaseAuthService`, so multiple service calls in one test share state.

**Contract**: Export helpers to seed `companies` (id, user_id), `job_offers` (id, company_id, published), and `job_applications` rows; mock must implement `from(table).select(...).eq(...).maybeSingle()`, `.insert(...).select(...).single()`, `.eq(...).order(...)` paths used by `JobApplicationService`. Insert assigns generated application id and persists row for subsequent list/CV queries. List filters by `company_id` from stored rows (behaviour mirrors Postgres semantics enough for oracle tests — not a production Supabase client).

#### 2. Harness smoke test

**File**: `apps/baza-api/src/testing/stateful-supabase.mock.spec.ts` (new, optional but recommended)

**Intent**: Verify the mock store alone — insert application, list by company_id returns correct subset — before wiring the full service.

**Contract**: Minimal test proving seed + filter works independent of `JobApplicationService`.

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-api` passes including new harness spec(s)
- `npm run lint` passes

#### Manual Verification:

- Review harness API: a reader can seed two companies and see list isolation without reading production service code

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Apply → Inbox Loop (Risk #1)

### Overview

Add integration tests that run `applyToPublishedOffer` then `listForOwner` against shared state.

### Changes Required:

#### 1. Marketplace loop integration spec

**File**: `apps/baza-api/src/app/company/job-application.integration.spec.ts` (new)

**Intent**: Prove Risk #1 with fixture membership oracle — not by copying list-query implementation into expectations only.

**Contract**: Test module uses real `JobApplicationService` with stateful Supabase mock + existing R2 mocks (`uploadApplicationCv` returns key under `applications/{companyA}/…`). Seed: company A (`user-a`), company B (`user-b`), published offer owned by A. Flow: apply with valid PDF → capture returned `id`; `listForOwner('user-a')` contains that id with email/phone; `listForOwner('user-b')` does not contain it. Assert apply response and list items have no `cvFileKey` / `cv_file_key`. Optional: assert `uploadApplicationCv` called with `companyA` id from offer (secondary signal, not sole oracle).

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-api` passes
- New spec includes at least one test named/descriptively documenting apply→inbox ownership

#### Manual Verification:

- Confirm test would fail if `company_id` on insert were wrong or list filter used a different company id (mental regression check)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: CV Cross-Tenant Isolation (Risk #2)

### Overview

Extend the integration spec with CV download scenarios using the same fixture state.

### Changes Required:

#### 1. CV isolation cases in integration spec

**File**: `apps/baza-api/src/app/company/job-application.integration.spec.ts`

**Intent**: Prove company B cannot stream company A's CV after a real apply chain; reinforce existing unit authz tests with shared fixture context.

**Contract**: After apply creates application `app-a` under company A: `getCvStreamForOwner('user-b', 'app-a')` throws `NotFoundException`; `getPrivateObject` not called. Happy path: `getCvStreamForOwner('user-a', 'app-a')` calls `getPrivateObject` with key matching `applications/company-a/…`. Keep existing foreign-row and prefix-mismatch unit tests in `job-application.service.spec.ts` — do not delete.

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-api` passes
- `npm run test` (root) passes

#### Manual Verification:

- Skim integration spec: scenarios map to test-plan Risk #2 response guidance (challenge "logged in ⇒ any CV")

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Test-Plan Cookbook Sync

### Overview

Document the pattern for future contributors and mark Phase 1 rollout complete in the test plan.

### Changes Required:

#### 1. Cookbook sections

**File**: `context/foundation/test-plan.md`

**Intent**: Replace TBD stubs with concrete guidance from this change.

**Contract**: Update §6.2 (integration test pattern — stateful mock + service loop), §6.4 (company-scoped application/CV tests), §6.6 per-rollout note for Phase 1. Set §3 Phase 1 **Status** to `done` when implementation merges (or `implemented` if you prefer forward-only — use `done` per archive convention). Bump §8 freshness date.

#### 2. Change identity

**File**: `context/changes/testing-critical-marketplace-loop/change.md`

**Intent**: Reflect planning complete; implementer advances to `implementing` via `/10x-implement`.

**Contract**: `status: planned` already set by this plan write; `/10x-implement` sets `implementing`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes (markdown-only change should not break lint)

#### Manual Verification:

- Read §6.2/§6.4 — another developer could add a similar test without reading the integration spec line-by-line
- §3 Phase 1 status accurately reflects merge state

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Existing `job-application.service.spec.ts` and `company.controller.spec.ts` remain; no regression.
- Optional harness unit spec validates mock store isolation.

### Integration Tests:

- `job-application.integration.spec.ts` — apply→list membership (#1), cross-tenant CV (#2), wire leakage (no cv key on DTOs).

### Manual Testing Steps:

1. Run `npx nx test baza-api --testPathPattern=integration` (or equivalent) and confirm new tests execute.
2. Temporarily break `company_id` insert in service (local only) — confirm Phase 2 test fails; revert.
3. Review test-plan cookbook for clarity.

## Performance Considerations

Negligible — a few extra Jest cases with in-memory mocks; no network or R2 I/O.

## Migration Notes

Not applicable — test-only change, no schema or production config.

## References

- Related research: `context/changes/testing-critical-marketplace-loop/research.md`
- Test plan: `context/foundation/test-plan.md` (Risks #1, #2; Phase 1)
- Service: `apps/baza-api/src/app/company/job-application.service.ts`
- Existing unit tests: `apps/baza-api/src/app/company/job-application.service.spec.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Stateful Supabase Test Harness

#### Automated

- [x] 1.1 `npx nx test baza-api` passes including new harness spec(s) — e3bf276
- [x] 1.2 `npm run lint` passes — e3bf276

#### Manual

- [x] 1.3 Review harness API: seed two companies and see list isolation without reading production service code — e3bf276

### Phase 2: Apply → Inbox Loop (Risk #1)

#### Automated

- [x] 2.1 `npx nx test baza-api` passes — 8ac4afe
- [x] 2.2 New spec includes at least one test documenting apply→inbox ownership — 8ac4afe

#### Manual

- [x] 2.3 Confirm test would fail if company_id insert or list filter regressed (mental regression check) — 8ac4afe

### Phase 3: CV Cross-Tenant Isolation (Risk #2)

#### Automated

- [x] 3.1 `npx nx test baza-api` passes
- [x] 3.2 `npm run test` (root) passes

#### Manual

- [x] 3.3 Skim integration spec: scenarios map to test-plan Risk #2 guidance

### Phase 4: Test-Plan Cookbook Sync

#### Automated

- [ ] 4.1 `npm run lint` passes

#### Manual

- [ ] 4.2 Read §6.2/§6.4 — pattern is actionable for future tests
- [ ] 4.3 §3 Phase 1 status reflects merge state
