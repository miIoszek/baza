# Delete own job offers — Plan Brief

> Full plan: `context/changes/delete-own-job-offers/plan.md`
> Research: `context/changes/delete-own-job-offers/research.md`

## What & Why

Companies need to permanently remove their own job offers (hard delete), including associated applications’ CVs in private R2. This closes the product gap left by soft-unpublish-only and satisfies the Delete half of MVP CRUD for offers.

## Starting Point

Offers already support create / update / soft-unpublish with JWT ownership checks. Application rows cascade on offer delete in Postgres; private R2 CVs do not. No delete API or UI exists yet.

## Desired End State

From the company offers list, **Usuń** (after confirm) hard-deletes the offer: CVs purged when required, DB row removed, apps cascade away. **Wycofaj** remains for soft hide.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Delete kind | Hard delete + CV purge | User-locked scope for certification CRUD Delete | Research / Plan |
| R2 errors (configured) | Fail-closed | Must not drop DB while leaving CVs | Plan |
| R2 unset | 503 if apps exist; else DB delete | Protect CV bytes when storage missing; allow empty offers locally | Plan |
| Empty offers | Same path; purge OK as no-op | One code path | Plan |
| Confirm UX | `window.confirm` + irreversible copy | Zero new dialog stack | Plan |
| Soft-unpublish | Keep Wycofaj + Usuń | Soft vs hard actions both useful | Plan / Research |
| Tests | API unit only | Enough to lock ownership + R2 policy | Plan |
| FE entry | List actions only | Matches unpublish placement | Research |

## Scope

**In scope:**
- `DELETE /api/company/offers/:id` + `deleteForUser`
- Fail-closed / 503 R2 gating as decided
- List UI Usuń + confirm
- API unit tests

**Out of scope:**
- Removing unpublish; MatDialog; FE delete specs; schema migrations; account delete; restore

## Architecture / Approach

`CompanyController` DELETE → `JobOfferService.deleteForUser` (inject R2) → ownership → R2 gate/purge (`applications/{companyId}/{offerId}`) → scoped offer delete → FK cascade apps. FE mirrors unpublish HTTP/snackbar with confirm first.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. API delete + R2 policy | Endpoint, fail-closed purge, unit tests | Silent R2 helper reused by mistake |
| 2. FE Usuń on list | Confirm + DELETE + keep Wycofaj | Weak confirm copy |

**Prerequisites:** Research complete; private R2 available for full manual CV checks  
**Estimated effort:** ~1–2 sessions across 2 phases

## Open Risks & Assumptions

- Fail-closed needs a **new** throwing purge path so apply compensation stays best-effort.
- ListObjects single-page limit is assumed fine per-offer CV volume.
- No roadmap Change ID for this folder — roadmap not updated.

## Success Criteria (Summary)

- Owner can permanently delete an offer (with or without applications) under the R2 rules above.
- Non-owner cannot delete; confirm cancel is a no-op.
- Wycofaj still works alongside Usuń.
