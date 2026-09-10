<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Company Public Profile (S-01)

- **Plan**: `context/changes/company-public-profile/plan.md`
- **Mode**: Deep
- **Date**: 2026-09-09
- **Verdict**: REVISE → SOUND (after triage fixes)
- **Findings**: 1 critical, 3 warnings, 1 observation

## Verdicts

| Dimension | Verdict (pre-triage) | After fixes |
|-----------|----------------------|-------------|
| End-State Alignment | PASS | PASS |
| Lean Execution | WARNING | PASS |
| Architectural Fitness | PASS | PASS |
| Blind Spots | FAIL | PASS |
| Plan Completeness | WARNING | PASS |

## Grounding

Phase 1 paths 8/8 ✓; Phase 2 `company.service.ts` + `dto/` absent (expected greenfield); symbols CompanyPublicProfile / uploadCompanyLogo / companyAuthGuard / AuthMeCompany ✓; brief↔plan phases ✓ (Current State refreshed in triage).

## Findings

### F1 — Photo “delete previous prefix” would wipe the new logo

- **Severity**: ❌ CRITICAL
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details → Photo replace; Phase 2
- **Detail**: Stable R2 prefix `companies/${userId}/logo`; post-success `deletePrefix` would delete the new upload. Register only deletes on failure.
- **Fix A ⭐ Recommended**: Overwrite in place; no post-success deletePrefix
- **Decision**: FIXED via Fix A (plan + brief updated); orphan `original.{oldExt}` accepted for MVP

### F2 — “Same validators as register + max lengths” invents caps

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Validation parity; Phase 2 DTO
- **Detail**: Register had floors only; user wants strict shared policy including email, exact NIP, max lengths, photo max size.
- **Fix A ⭐ Recommended**: Explicit MaxLength + tighten register + PATCH + FE together
- **Decision**: FIXED via Fix A + user override — strict table: email valid, NIP exactly 10 digits, name 2–120, description 1–2000, baseLocation 1–200, photo JPEG/PNG/WebP ≤5 MB on register and edit

### F3 — Current State / brief still describe pre–Phase 1 world

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Current State Analysis; plan-brief Starting Point
- **Detail**: Stale gaps listed despite Phase 1 Progress complete.
- **Fix**: Rewrite Current State + brief Starting Point for Phase 2 entry
- **Decision**: FIXED

### F4 — Phase 3 re-lists public controller specs already shipped

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Lean Execution
- **Location**: Phase 3 → API tests
- **Detail**: Phase 1 already shipped `company-public.controller.spec.ts`.
- **Fix**: Narrow Phase 3 to PATCH + FE edit specs + CI mirror; keep/extend public specs only if needed
- **Decision**: FIXED

### F5 — Public logo variant order ≠ navbar (already shipped)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: End-State Alignment
- **Location**: Phase 1 FE (done)
- **Detail**: Navbar `s96 ?? s48 ?? original` vs public `s192 ?? s512 ?? s96 ?? original`.
- **Fix**: Optional align later
- **Decision**: ACCEPTED — cosmetic; noted in Current State as optional polish
