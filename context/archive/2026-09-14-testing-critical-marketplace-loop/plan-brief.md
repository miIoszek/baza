# Critical Marketplace Loop Tests — Plan Brief

> Full plan: `context/changes/testing-critical-marketplace-loop/plan.md`
> Research: `context/changes/testing-critical-marketplace-loop/research.md`

## What & Why

Baza's critical marketplace loop (driver apply → company inbox → CV download) works in production code but **CI does not prove it**. We add stateful service integration tests for test-plan Risks **#1** and **#2** so regressions in company scoping or CV isolation fail before merge.

## Starting Point

- Apply, inbox list, and CV stream are implemented in `JobApplicationService` with private R2 storage.
- Unit tests mock each DB call separately; they cover CV authz edge cases but never chain apply → list with shared state.
- No Playwright; Jest via `npx nx test baza-api` is the API test gate.

## Desired End State

Developers run `npm run test` and get automated proof that: (1) after apply on company A's offer, A's inbox lists the application and B's does not; (2) B cannot download A's CV; (3) responses never leak `cvFileKey`. The test-plan cookbook documents how to add similar tests.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Test layer | Stateful service integration | Matches existing Nest TestingModule + mock pattern; closes loop without supertest setup | Plan |
| Cross-tenant #2 | Service-level foreign CV scenarios | Extends proven authz tests with apply fixture context | Plan |
| Oracle for #1 | Fixture membership (known A/B ids) | Catches wrong `company_id` linkage without mirroring filter code as sole proof | Plan |
| Scope beyond code | Cookbook §6.2 + §6.4 update | Closes M3L1 deliverable; guides future agents | Plan |
| HTTP supertest | Out of scope | Higher cost; service layer sufficient for Phase 1 | Research |
| Playwright e2e | Out of scope | Research: defer unless cheaper layers miss signal | Research |
| Private bucket ACL | Ops/document only | App tests cannot prove Cloudflare account ACL | Research |

## Scope

**In scope:**

- Stateful Supabase mock harness under `apps/baza-api/src/testing/`
- `job-application.integration.spec.ts` for apply→inbox (#1) and CV isolation (#2)
- Cookbook updates in `context/foundation/test-plan.md`

**Out of scope:**

- Supertest, real test Supabase, Playwright, FE specs, new CI targets, Risks #3–#6

## Architecture / Approach

```
Seed fixtures (company A/B, offer, apply)
        ↓
JobApplicationService.applyToPublishedOffer  →  in-memory job_applications
        ↓
listForOwner(user-A) ∋ appId ; listForOwner(user-B) ∌ appId
        ↓
getCvStreamForOwner(user-B, appId) → 404, no R2 get
```

Real `JobApplicationService` + mocked R2; shared in-memory store replaces per-call Supabase mocks.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Stateful harness | Reusable in-memory Supabase double | Mock chain incomplete → false greens |
| 2. Apply→inbox (#1) | Loop test with fixture membership oracle | Mirror-oracle anti-pattern |
| 3. CV isolation (#2) | Cross-tenant download tests on same fixtures | Duplicating unit tests without added signal |
| 4. Cookbook sync | test-plan.md §6.2/§6.4 + Phase 1 status | Docs drift from actual spec paths |

**Prerequisites:** Research complete; `npm run test` works on `main`.

**Estimated effort:** ~1–2 sessions across 4 phases.

## Open Risks & Assumptions

- Stateful mock must implement enough Supabase chain methods; gaps could hide bugs — mitigate with harness smoke test.
- Service-layer tests do not exercise `JwtAuthGuard`; acceptable for Phase 1 per decision; HTTP layer deferred.
- Private R2 bucket world-readability remains an ops concern, not automated here.

## Success Criteria (Summary)

- `npx nx test baza-api` includes failing-on-regression tests for apply→inbox and cross-tenant CV.
- No `cvFileKey` on apply/list wire shapes in tests.
- Test-plan cookbook no longer TBD for integration patterns.
