# Delete own job offers Implementation Plan

## Overview

Let a logged-in company hard-delete its own job offer via `DELETE /api/company/offers/:id`, purge associated private R2 CVs under that offer (fail-closed when storage is required), rely on existing DB `ON DELETE CASCADE` for `job_applications` rows, and expose **Usuń** on the company offers list with a native confirm dialog. Soft-unpublish (**Wycofaj**) stays.

## Current State Analysis

- Owned offer mutate surface exists: create / update / unpublish on `CompanyController` → `JobOfferService`; no DELETE.
- Ownership is settled: `requireCompanyForUser` + `getOwnedOffer` (404 `Oferta nie znaleziona`).
- `job_applications.job_offer_id` → `job_offers(id) ON DELETE CASCADE` — deleting the offer row removes application rows; R2 objects do not cascade.
- CV keys: `applications/{companyId}/{offerId}/{versionId}/cv.pdf`. Cleanup helper: `R2StorageService.deletePrivatePrefix` (best-effort, swallows errors today). `isPrivateConfigured()` already exists.
- `CompanyModule` already imports `StorageModule` — `JobOfferService` can inject `R2StorageService` with no module change.
- FE list has Edytuj / Wycofaj; no confirm dialogs and no `HttpClient.delete` usage yet.

## Desired End State

- Company can permanently remove an owned offer from the list UI; confirm warns that applications and CVs are destroyed.
- After success: offer gone from owner list and public browse; related applications gone from inbox; CV objects under the offer prefix gone from private R2 when private R2 is in play.
- Non-owners / unknown ids get the same 404 shape as other owned mutates.
- Soft-unpublish remains available for published offers.

### Key Discoveries:

- Template method: `JobOfferService.unpublishForUser` (`job-offer.service.ts` ~162–181).
- Cascade: `supabase/migrations/20260911210000_job_applications.sql` (`ON DELETE CASCADE` on `job_offer_id`).
- R2: `deletePrivatePrefix` + `isPrivateConfigured()` in `r2-storage.service.ts`; today cleanup does not throw — delete path must add a fail-closed variant or option.
- FE placement: `company-offers-list-page.html` actions (~57–66) next to Wycofaj.

## What We're NOT Doing

- Removing or changing soft-unpublish.
- Delete from the offer edit form (list only).
- MatDialog / custom confirm UI.
- Frontend unit tests for delete (API unit tests only for this change).
- Schema migrations (cascade already present).
- Account/company delete, bulk delete, or restoring deleted offers.
- Changing public apply / inbox APIs beyond natural empty results after cascade.
- Soft-delete columns or archive tables.

## Implementation Approach

1. **API first:** `deleteForUser` on `JobOfferService` + `DELETE` route on `CompanyController`, same JWT/ownership as unpublish.
2. **Storage policy (locked):**
   - Order: resolve owned offer → decide R2 gate → purge offer-scoped private prefix → delete `job_offers` row (scoped by `company_id`).
   - Offer-scoped prefix: `applications/{companyId}/{offerId}`.
   - If private R2 **is** configured: purge must **fail closed** (throw on R2 error → API 5xx, offer row kept). Do not rely on today’s silent `deletePrivatePrefix`.
   - If private R2 **is not** configured: if any `job_applications` exist for that offer (they always have `cv_file_key`) → `503` and do not delete; if zero applications → delete DB row only.
   - Zero applications + R2 configured: still call purge (no-op / empty list is OK), then delete row.
3. **FE:** Usuń on every list row; `window.confirm` with irreversible Polish copy (applications + CVs); on OK `DELETE` then snackbar + reload (mirror unpublish error/success handling).
4. **Tests:** API unit only — ownership 404; success calls fail-closed purge then DB delete; R2 throw blocks DB delete; R2 unset + apps → 503; R2 unset + no apps → DB delete.

## Critical Implementation Details

### Timing & lifecycle

Purge private R2 **before** deleting the offer row. If purge fails, abort — never leave “DB deleted, CVs still in bucket” under the fail-closed policy. Application rows disappear only via FK cascade after a successful offer delete.

### User experience spec

Confirm copy must state that the action is permanent and removes applications and CVs for that offer. Cancel must not call the API.

---

## Phase 1: API delete + R2 policy

### Overview

Add authenticated hard-delete for owned offers with the locked R2/application gating, plus unit tests that lock the contracts.

### Changes Required:

#### 1. Fail-closed private prefix delete

**File**: `apps/baza-api/src/app/storage/r2-storage.service.ts`

**Intent**: Offer delete needs a private-bucket prefix purge that surfaces failures (unlike best-effort `deletePrivatePrefix` used for apply compensation). Prefer a new method or an explicit option so existing best-effort callers stay unchanged.

**Contract**: When private R2 is configured, a failed list/delete of objects under the prefix must throw (map to a Nest HTTP error suitable for 5xx, consistent with other R2 hard failures). When private R2 is not configured, this helper should not silently claim success in a way that confuses callers — callers use `isPrivateConfigured()` for the unset gate. Keep `deletePrivatePrefix` behavior for apply/register compensation.

#### 2. `JobOfferService.deleteForUser`

**File**: `apps/baza-api/src/app/company/job-offer.service.ts`

**Intent**: Hard-delete an offer owned by the authenticated user’s company, enforcing CV purge rules before removing the row.

**Contract**:
- Signature mirrors other owned mutates: `(userId: string, offerId: string) => Promise<void>` (or equivalent empty success).
- Inject `R2StorageService` alongside `SupabaseAuthService`.
- Flow: `requireCompanyForUser` → `getOwnedOffer` (404 if missing) → if `!isPrivateConfigured()`: count/select applications for `job_offer_id` (+ company scope); if any → `ServiceUnavailableException` (Polish message that storage is unavailable); if none → delete offer row → return → if configured: fail-closed purge `applications/{companyId}/{offerId}` → delete offer with `.eq('id', offerId).eq('company_id', company.id)` → on DB error throw internal/not-found consistent with siblings.
- Do not manually delete `job_applications` rows (FK cascade).

#### 3. Controller route

**File**: `apps/baza-api/src/app/company/company.controller.ts`

**Intent**: Expose hard delete on the company offers API.

**Contract**: `DELETE company/offers/:id` behind existing `JwtAuthGuard`; call `deleteForUser(requireUserId(req), id)`; success `204` or `200` empty — pick one Nest-conventional style and use it consistently (prefer `204 No Content` if no body).

#### 4. Unit tests

**File**: `apps/baza-api/src/app/company/job-offer.service.spec.ts` (and R2 spec only if a new throwing helper needs direct coverage)

**Intent**: Lock ownership, ordering, and R2 gating without FE tests.

**Contract**: Cover at least:
- unknown / not-owned offer → `NotFoundException`; no R2 purge / no DB delete
- success with R2 configured → fail-closed purge invoked with offer prefix, then DB delete
- R2 purge throws → DB delete not called
- R2 unset + ≥1 application → `ServiceUnavailableException`; no DB delete
- R2 unset + 0 applications → DB delete, no failing purge requirement

### Success Criteria:

#### Automated Verification:

- Unit tests for delete contracts pass: `npx nx test baza-api --testPathPattern=job-offer.service`
- Typecheck/lint for touched API files: `npx nx run baza-api:lint` (or repo lint equivalent for changed paths)
- No regressions in existing `job-offer.service` specs

#### Manual Verification:

- With private R2 configured: delete owned offer that has applications → offer and inbox rows gone; CV objects under offer prefix gone from private bucket (or verified via subsequent download 404)
- Delete offer with zero applications succeeds
- Delete another company’s offer id → 404
- With private R2 unset and seed applications present → 503 and offer remains

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: FE Usuń on company offers list

### Overview

Add list-row delete with confirm + DELETE call; keep Wycofaj unchanged.

### Changes Required:

#### 1. List page logic

**File**: `apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.ts`

**Intent**: Call the new delete endpoint after user confirmation; reuse snackbar + reload patterns from `unpublish`.

**Contract**:
- Method e.g. `deleteOffer(id: string)`: `window.confirm` with Polish irreversible copy mentioning applications and CVs; on cancel return; on OK `HttpClient.delete` to `${environment.apiBaseUrl}/api/company/offers/${id}`; on success snackbar + `reload()`; on error snackbar with existing Polish error fallback style.
- Auth interceptor already attaches Bearer — no special headers.

#### 2. List template

**File**: `apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.html`

**Intent**: Surface Usuń for every offer row (published or not).

**Contract**: Button in `offers-list__actions` beside Edytuj / Wycofaj; visible regardless of `o.published`; wire `(click)` to delete method. Do not remove Wycofaj.

### Success Criteria:

#### Automated Verification:

- Frontend lint/typecheck for touched files: `npx nx run baza-frontend:lint` (or project equivalent)
- Existing `company-offers-list-page.spec.ts` still passes (no new FE delete specs required)

#### Manual Verification:

- Confirm cancel → no network DELETE, list unchanged
- Confirm OK → offer disappears from list; snackbar success
- Published offer: both Wycofaj and Usuń still available; after Wycofaj, Usuń still works
- Error path (e.g. forced 503) shows snackbar and leaves row

**Implementation Note**: After completing this phase and all automated verification passes, pause for human manual confirmation.

---

## Testing Strategy

### Unit Tests:

- `deleteForUser` ownership 404
- Success path purge-then-delete ordering
- Fail-closed: R2 error blocks DB delete
- R2 unset + apps → 503
- R2 unset + no apps → DB delete

### Integration Tests:

- Not required for this change (decision: API unit only).

### Manual Testing Steps:

1. Company A: create/publish offer, apply as driver (or seed app + CV), delete offer → inbox empty for that offer; CV download for old id fails; public offer 404.
2. Company A: unpublished offer with no apps → delete succeeds.
3. Confirm dialog cancel → no delete.
4. Optional misconfig: unset private R2 locally with apps present → 503.

## Performance Considerations

Prefix delete is one ListObjects page + batch delete — adequate for expected CV counts per offer. No public list cache invalidation beyond natural refetch.

## Migration Notes

No SQL migration. Existing cascade is sufficient. No backfill of orphan R2 from prior unpublish-only era (out of scope).

## References

- Related research: `context/changes/delete-own-job-offers/research.md`
- Ownership template: `apps/baza-api/src/app/company/job-offer.service.ts` (`unpublishForUser`)
- Cascade: `supabase/migrations/20260911210000_job_applications.sql`
- R2: `apps/baza-api/src/app/storage/r2-storage.service.ts` (`deletePrivatePrefix`, `isPrivateConfigured`)
- FE list: `apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: API delete + R2 policy

#### Automated

- [x] 1.1 Unit tests for delete contracts pass (`job-offer.service`)
- [x] 1.2 Typecheck/lint for touched API files
- [x] 1.3 No regressions in existing `job-offer.service` specs

#### Manual

- [x] 1.4 Delete owned offer with applications — offer, inbox rows, CVs gone
- [x] 1.5 Delete offer with zero applications succeeds
- [x] 1.6 Delete another company’s offer id → 404
- [x] 1.7 Private R2 unset + applications → 503 and offer remains

### Phase 2: FE Usuń on company offers list

#### Automated

- [x] 2.1 Frontend lint/typecheck for touched files
- [x] 2.2 Existing `company-offers-list-page.spec.ts` still passes

#### Manual

- [x] 2.3 Confirm cancel → no DELETE
- [x] 2.4 Confirm OK → offer removed + success snackbar
- [x] 2.5 Wycofaj still available; Usuń works on unpublished offers
- [x] 2.6 Error path shows snackbar and leaves row
