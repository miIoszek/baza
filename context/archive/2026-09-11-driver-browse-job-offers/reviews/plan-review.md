<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Driver Browse Job Offers (S-03)

- **Plan**: context/changes/driver-browse-job-offers/plan.md
- **Mode**: Deep
- **Date**: 2026-09-11
- **Verdict**: SOUND
- **Findings**: 1 critical 2 warnings 1 observation
- **Triage**: F1 FIXED, F2 FIXED (Fix A), F3 FIXED (Fix A), F4 FIXED

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | FAIL |

## Grounding

Grounding: 8/8 paths ✓, listPublished/mapOffer/JobOfferFilters ✓, brief↔plan ✓

## Findings

### F1 — Progress rows don’t 1:1 match Manual Success Criteria

- **Severity**: ❌ CRITICAL
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: ## Progress vs Phase 1–3 Manual Verification
- **Detail**: Progress contract requires each Success Criteria bullet to have its own `- [ ] N.M` row. Phase 1 Manual has 2 bullets → only `1.4`; Phase 2 Manual has 3 → only `2.3`; Phase 3 Manual has 2 → only `3.4`. Automated rows match.
- **Fix**: Expand Progress Manual subsections to one row per Success Criteria bullet (renumber within phase; keep Automated indices).
- **Decision**: FIXED — expanded Progress Manual rows 1:1 with Success Criteria bullets

### F2 — Phase 1 requires license on create/update before FE sends it

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Blind Spots
- **Location**: Phase 1 (DTO) vs Phase 3 (company form)
- **Detail**: Plan makes `licenseCategory` required on Nest create/update in Phase 1. Current form has no license field — Phase 1 alone breaks create/edit until Phase 3.
- **Fix A ⭐ Recommended**: Phase 1 = DB column + mapOffer + public filters only; keep create/update license optional until Phase 3 makes it required FE+BE together.
- **Fix B**: Move company form license into Phase 1 (collapse P3 into P1).
- **Decision**: FIXED via Fix A — Phase 1 optional license on create/update; required FE+BE in Phase 3

### F3 — License value `C+E` breaks in query strings if `+` is unencoded

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Implementation Approach / Phase 2 URL sync
- **Detail**: Wire enum includes `C+E`. Loose query parsing turns `+` into space → filter miss.
- **Fix A ⭐ Recommended**: Keep display `C+E`; wire as `C_E` (or `CE_PLUS`) in DB/API/URL; map in shared types.
- **Fix B**: Keep `C+E` everywhere; mandate encodeURIComponent / HttpParams.
- **Decision**: FIXED via Fix A — wire/DB `C_E`, UI label `C+E`

### F4 — First `@Query()` DTO in baza-api (no in-repo pattern)

- **Severity**: 💭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 Nest DTOs
- **Detail**: Global ValidationPipe exists; no `@Query()` DTO examples. Implementer must handle near coords transform and countries split.
- **Fix**: Add one sentence under Phase 1 Contract for `@Query()` DTO + number transform + comma-separated countries.
- **Decision**: FIXED — Phase 1 Contract notes first `@Query()` DTO + number coerce + countries split
