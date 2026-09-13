<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Company Application Inbox (S-05)

- **Plan**: `context/changes/company-application-inbox/plan.md`
- **Mode**: Deep
- **Date**: 2026-09-13
- **Verdict**: REVISE → SOUND (after triage fixes)
- **Findings**: 0 critical, 2 warnings, 2 observations

## Verdicts

| Dimension | Verdict (pre-triage) | After fixes |
|-----------|----------------------|-------------|
| End-State Alignment | PASS | PASS |
| Lean Execution | PASS | PASS |
| Architectural Fitness | WARNING | PASS |
| Blind Spots | WARNING | PASS |
| Plan Completeness | PASS | PASS |

## Grounding

9/9 paths ✓, symbols ✓ (`requireCompanyForUser` private on JobOfferService), brief↔plan ✓. No `docs/reference/contract-surfaces.md`.

## Findings

### F1 — Ownership prefers calling a private method

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Critical Implementation Details — Ownership
- **Detail**: Plan preferred inject `JobOfferService.requireCompanyForUser`, but that method is private (`job-offer.service.ts:297`).
- **Fix A ⭐ Recommended**: Duplicate private `requireCompanyForUser` on `JobApplicationService`.
- **Fix B**: Extract shared public helper / `AuthService.getCompanyForUser`.
- **Decision**: FIXED via Fix A

### F2 — CV stream is greenfield; Body→Nest path underspecified

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details — CV stream / Phase 1.2–1.4
- **Detail**: No StreamableFile / GetObjectCommand precedent; missing Body→404 and CompanyController DI notes.
- **Fix**: Specify GetObject → !Body NotFound → StreamableFile + PDF headers; inject JobApplicationService + spec mock.
- **Decision**: FIXED

### F3 — hasCv: true constant on list DTO

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Lean Execution
- **Location**: List DTO
- **Detail**: Schema requires `cv_file_key`; `hasCv` adds no information.
- **Fix**: Drop `hasCv`; FE always shows “Pobierz CV”.
- **Decision**: FIXED (applied with F2)

### F4 — Nest/FE blob download has no in-repo precedent

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 2.4
- **Detail**: authInterceptor covers blob GETs; no existing `responseType: 'blob'` download pattern.
- **Fix**: Note in plan FE section (already covered with F2 edit).
- **Decision**: FIXED (applied with F2)
