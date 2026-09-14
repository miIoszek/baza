<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Critical Marketplace Loop Tests

- **Plan**: `context/changes/testing-critical-marketplace-loop/plan.md`
- **Scope**: All phases (1–4 of 4)
- **Date**: 2026-09-14
- **Verdict**: APPROVED (triage complete: F1–F4 FIXED)
- **Findings**: 0 critical, 2 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Insert always writes job_applications regardless of table

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: apps/baza-api/src/testing/stateful-supabase.mock.ts:163-186
- **Detail**: `single()` on insert always pushes into `store.jobApplications` and ignores `state.table`. A miswired `.from('companies').insert(...)` would still mutate applications with `error: null`, risking a false green if a future test misuses the mock.
- **Fix**: Guard `state.table === 'jobApplications'` (and throw or return an error otherwise) before persisting.
  - Strength: Makes mock misuse fail loudly; current integration paths already only insert into job_applications.
  - Tradeoff: Tiny harness change; optional extra smoke assertion.
  - Confidence: HIGH — insert table is known at query start.
  - Blind spot: None significant for current specs.
- **Decision**: FIXED

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: apps/baza-api/src/testing/stateful-supabase.mock.ts:148-151, 188, 193-195
- **Detail**: Unknown tables / non-select `maybeSingle` / non-insert `single` / list on non-`jobApplications` return `{ data: null|[], error: null }`. Today's JobApplicationService chains still fail assertions if filters are dropped, but a future chain that treats empty as success could green incorrectly.
- **Fix A ⭐ Recommended**: Fail loud (throw) on unsupported table/operation combinations used outside the documented JobApplicationService chains.
  - Strength: Converts silent mock gaps into red tests when the harness is misused.
  - Tradeoff: Slightly less "Supabase-like" (real client returns empty, not throw).
  - Confidence: HIGH — mock is test-only and scoped to known chains.
  - Blind spot: Any future intentional empty-result scenarios would need explicit support.
- **Fix B**: Leave silent empties; document supported chains only in cookbook §6.2.
  - Strength: Zero code change; docs already describe intended usage.
  - Tradeoff: False-green risk remains for future misuse.
  - Confidence: MEDIUM — depends on contributor discipline.
  - Blind spot: Haven't audited all future call shapes.
- **Decision**: FIXED via Fix A

### F3 — Cross-tenant CV denial may rely on prefix check alone

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: apps/baza-api/src/app/company/job-application.integration.spec.ts (Risk #2 case) + job-application.service.ts prefix check
- **Detail**: If `.eq('company_id', …)` on CV lookup regresses but the key still starts with `applications/company-a/`, company B's stream still 404s via the prefix check — so the integration test can stay green while one authz layer is broken. Unit specs already cover foreign-row and prefix-mismatch separately.
- **Fix**: Optional: add an assert that foreign lookup does not invoke R2 (already present) plus a case where prefix would allow but company filter must deny — or assert mock filter args. Acceptable to skip given unit coverage.
- **Decision**: FIXED

### F4 — §3 Phase 1 marked done before PR merge

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/foundation/test-plan.md §3
- **Detail**: Desired End State said status can move to `done` after merge; Phase 4 contract allowed `done` on implementation. Status is already `done` while the PR may still be open — acceptable per Phase 4 wording, slight wording tension with Desired End State.
- **Fix**: Leave as-is, or flip to `implemented` until merge then `done` — team preference only.
- **Decision**: FIXED — Status set to `implemented` until PR merge, then `done`