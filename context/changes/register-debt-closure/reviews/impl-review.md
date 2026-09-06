<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Register Debt Closure

- **Plan**: `context/changes/register-debt-closure/plan.md`
- **Scope**: Full plan (Phases 1–3 of 3)
- **Date**: 2026-09-06
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical · 2 warnings · 2 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | WARNING |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | WARNING |
| Success Criteria    | PASS    |

## Automated checks (re-run)

| Check | Result |
| ----- | ------ |
| `npx nx build baza-api` | PASS |
| `npx nx test baza-api` (7 tests) | PASS |
| `npx nx lint baza-api` | PASS |

## Progress

All Progress rows `[x]` (Phases 1–3). Manual items marked complete with user confirmation (including local fail-closed boot + successful run with filled `.env`).

## Plan vs diff

| Planned / related | Verdict |
| ----------------- | ------- |
| `main.ts` + `supabase-env.ts` boot gate | MATCH |
| `auth.service.ts` admin-only + deleteUser `{ error }` | MATCH |
| `supabase-auth.service.ts` messaging | MATCH (with caveat F1) |
| `auth.service.spec.ts` four scenarios | MATCH |
| `.env.example` + `deploy-plan.md` | MATCH |
| `tsconfig.spec.json` express/multer types | EXTRA (benign) |
| Multer F5 / unified error filter / R2-at-boot / FE | NOT DONE (correct) |

## Findings

### F1 — SupabaseAuthService message vs anon-key fallback

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality / Pattern Consistency
- **Location**: `apps/baza-api/src/app/auth/supabase-auth.service.ts:14-23`
- **Detail**: Exception text says service role is required and anon alone is not enough, but `getClient()` still falls back to `SUPABASE_ANON_KEY` when service role is absent. Under normal Nest boot this is unreachable (boot gate), but constructing the service outside bootstrap (or clearing env after boot) can still use anon while claiming otherwise.
- **Fix A ⭐ Recommended**: Require `SUPABASE_SERVICE_ROLE_KEY` in `getClient()` (no anon fallback); throw if missing.
  - Strength: Aligns messaging, boot gate, and runtime client creation.
  - Tradeoff: Breaks any intentional anon-only use of this service outside Nest boot.
  - Confidence: HIGH — matches Phase 1 contract and fail-closed product decision.
  - Blind spot: None significant for Nest API process.
- **Fix B**: Soften the error message to document the fallback as last-resort only (keep code).
  - Strength: Zero behavior change.
  - Tradeoff: Leaves a dead/contradictory path that can confuse future agents.
  - Confidence: MEDIUM.
  - Blind spot: Whether any test/tooling relies on anon fallback.
- **Decision**: FIXED via Fix A — require SERVICE_ROLE only; drop anon fallback

### F2 — Deploy plan still says “no Auth code yet”

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `context/deployment/deploy-plan.md:21`
- **Detail**: Phase 3 updated the env table/boot gate, but the “What is live” Supabase row still says “no Auth code yet,” which is stale after register/auth work.
- **Fix**: Update that row to reflect Auth + boot-gate reality (names only, no secrets).
- **Decision**: FIXED — updated live-status row for Auth + boot gate

### F3 — No unit test for `assertRequiredSupabaseEnv`

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria / Safety & Quality
- **Location**: `apps/baza-api/src/supabase-env.ts`
- **Detail**: Compensation paths are covered in `auth.service.spec.ts`; the pure boot-gate helper has no direct unit test (blank/missing key naming). Manual + runtime evidence exists.
- **Fix**: Add a tiny `supabase-env.spec.ts` for missing/blank keys and message contents.
- **Decision**: FIXED — added `apps/baza-api/src/supabase-env.spec.ts`

### F4 — Upstream Supabase errors may reach the client on register

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-api/src/app/auth/auth.service.ts` (company insert / mapSignUpError paths)
- **Detail**: Some provider messages are forwarded via `BadRequestException(message)`. Partly pre-existing pattern; still present after this change’s register simplification.
- **Fix**: Map unknown provider errors to stable public messages; log raw detail server-side.
- **Decision**: FIXED — stable public messages for register/company insert; raw provider detail logged server-side

## Triage summary

| ID | Outcome |
| -- | ------- |
| F1 | FIXED (Fix A) |
| F2 | FIXED |
| F3 | FIXED |
| F4 | FIXED |

All review findings triaged and applied.
