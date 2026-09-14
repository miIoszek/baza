<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Delete own job offers

- **Plan**: `context/changes/delete-own-job-offers/plan.md`
- **Scope**: Phase 1–2 of 2 (full plan)
- **Date**: 2026-09-14
- **Verdict**: APPROVED
- **Findings**: 0 critical / 2 warnings / 1 observation

## Verdicts

| Dimension | Verdict |
| --------- | ------- |
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

► Overall: **APPROVED** (≤2 minor warnings; manual verified by user)

## Findings

### F1 — DeleteObjects partial errors not checked

- **Severity**: WARNING
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-api/src/app/storage/r2-storage.service.ts` (~DeleteObjectsCommand)
- **Detail**: Fail-closed path throws on thrown SDK errors but does not inspect `DeleteObjects` per-key `Errors` array; rare partial failure could leave orphan CVs after DB delete.
- **Fix**: Check response `Errors` and throw when non-empty (same fail-closed contract).
- **Decision**: Accept — MVP volume; track as follow-up if needed.

### F2 — Concurrent apply during purge→delete window

- **Severity**: WARNING
- **Impact**: MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-api/src/app/company/job-offer.service.ts` (`deleteForUser`)
- **Detail**: Offer may stay published until row delete; a concurrent apply could write a new CV then lose the app row via CASCADE while leaving an R2 object.
- **Fix**: Unpublish/lock before purge, or re-purge after DB delete.
- **Decision**: Accept — low traffic MVP; user-confirmed happy path.

### F3 — Single-page ListObjects

- **Severity**: OBSERVATION
- **Impact**: LOW
- **Dimension**: Safety & Quality
- **Location**: `r2-storage.service.ts` ListObjectsV2
- **Detail**: No ContinuationToken loop; >~1000 keys under one offer prefix incomplete. Plan already noted.
- **Decision**: Accept.

## Success criteria check

- Automated: unit tests + lint passed in implement + pre-commit (61 related API tests on feature commit).
- Manual: user confirmed delete works (empty own list/profile after delete).

## Notes

No plan drift; “What We're NOT Doing” respected (Wycofaj kept, list-only Usuń, no MatDialog, no FE delete specs).
