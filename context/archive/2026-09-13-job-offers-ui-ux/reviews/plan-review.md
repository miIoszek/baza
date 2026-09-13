<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Job Offers list + detail UI/UX

- **Plan**: context/changes/job-offers-ui-ux/plan.md
- **Mode**: Deep
- **Date**: 2026-09-13
- **Verdict**: SOUND (after triage fixes; was REVISE)
- **Findings**: 0 critical  3 warnings  1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS (was WARNING; F2 fixed) |
| Blind Spots | PASS (was WARNING; F3–F4 fixed) |
| Plan Completeness | PASS (was WARNING; F1 fixed) |

## Grounding
11/11 paths ✓, symbols ✓, brief↔plan ✓, Progress↔Phases ✓

## Findings

### F1 — Wrong Jest filter flag for baza-api

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 Success Criteria / Progress 1.1
- **Detail**: Plan used `--testPathPattern`; Jest 30 requires `--testPathPatterns`.
- **Fix**: Replace with `npx nx test baza-api --testPathPatterns=job-offer.service`.
- **Decision**: FIXED

### F2 — mapOffer shared: “public-facing selects only” underspecified

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Phase 1 Critical Details / Nest contract
- **Detail**: All 7 selects share `mapOffer`; public-only select updates leave owner paths empty.
- **Fix A ⭐ Recommended**: One shared select fragment for ALL mapOffer paths.
- **Decision**: FIXED (Fix A)

### F3 — Card click + nested company link pattern not locked

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details + Phase 2 Cards
- **Detail**: Plan allowed two card patterns; nested interactives are risky.
- **Fix A ⭐ Recommended**: Card host focusable → detail; inner company `<a>` with stopPropagation.
- **Decision**: FIXED (Fix A)

### F4 — Keep redirectTo relative so filter query params survive

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 5
- **Detail**: Relative `redirectTo: ''` preserves query; absolute `'/'` can drop it.
- **Fix**: Explicit Phase 5 contract sentence forbidding absolute `'/'`.
- **Decision**: FIXED
