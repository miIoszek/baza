<!-- PLAN-REVIEW-REPORT -->
# Plan Review: UX Improvements (S-06)

- **Plan**: context/changes/ux-improvements/plan.md
- **Mode**: Deep
- **Date**: 2026-09-13
- **Verdict**: SOUND (after triage fixes; was REVISE)
- **Findings**: 0 critical  3 warnings  0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | PASS (was WARNING; F3 fixed) |
| Plan Completeness | PASS (was WARNING; F1–F2 fixed) |

## Grounding
8/8 existing paths ✓, new async-status OK, 4/4 symbols ✓, brief↔plan ✓, Progress↔Phases ✓

## Findings

### F1 — Wrong targeted-test CLI flag for Angular unit-test

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 Success Criteria / Progress 2.1
- **Detail**: Plan used `npx nx test baza-frontend --testPathPattern=job-offers-page`. Frontend test target is `@angular/build:unit-test` (Vitest), not Jest — `--testPathPattern` will not filter correctly.
- **Fix**: Replace with `npx nx test baza-frontend --include=src/app/pages/job-offers/job-offers-page.spec.ts` (or full suite). Update Phase 2 Automated Verification + Progress 2.1.
- **Decision**: FIXED

### F2 — Browse retry mechanism left as two alternatives

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Critical Implementation Details + Phase 2
- **Detail**: Plan said extract fetch OR reloadTick without picking one. A raw second `http.get` outside the pipe races with filter changes.
- **Fix A ⭐ Recommended**: Lock `reloadTick` + combineLatest/switchMap
  - Strength: Keeps one subscription and switchMap cancelation with minimal restructuring.
  - Tradeoff: Slightly more RxJS wiring than a naive extract.
  - Confidence: HIGH — fits current queryParamMap → switchMap shape.
  - Blind spot: Exact combineLatest vs mergeWith API choice still local.
- **Fix B**: Extract GET Observable; retry via Subject into same switchMap
  - Strength: Clear separation of “build request” vs “when to load”.
  - Tradeoff: More refactor of ngOnInit for the same race safety.
  - Confidence: HIGH — also feasible with current helpers.
  - Blind spot: Easy to accidentally subscribe twice if Subject wiring slips.
- **Decision**: FIXED (Fix A)

### F3 — Company-list offers-on-error behavior ambiguous

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details (Company list empty vs error)
- **Detail**: Plan allowed leave-as-is OR clear; peer clears to `[]`. Exclusive `@if (error)` is what prevents false empty.
- **Fix**: On GET failure set `error`, do not call `offers.set`; template shows error exclusively before empty/list. Stale list hidden while error is set; successful reload replaces offers.
- **Decision**: FIXED
