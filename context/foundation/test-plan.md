# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-14

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "<the
   team is worried about X, and the failure would surface somewhere in
   <area>>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `apps/baza-api/src`, `apps/baza-frontend/src`, `libs/baza/ui/src`, `libs/shared/types/src`, `libs/api/core/src`, `libs/api/data-access/src`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|-------------------------|--------|------------|--------------------------------|
| 1 | Driver submits CV/application, but the company never sees it in the employer inbox | High | High | interview Q1; PRD US-01 / FR-005; roadmap north star S-05 |
| 2 | Driver CV or contact details become visible to the wrong company or via a public/shared storage path | High | High | interview Q2; PRD Guardrails + Access Control; hot-spot dir `apps/baza-api/src/app` (storage/auth churn) |
| 3 | Job Offers filters (route countries + home-return cadence) silently return wrong or empty matches while valid offers exist | High | High | interview Q3–Q4; PRD FR-007; hot-spot dirs `apps/baza-frontend/src/app`, `libs/shared/types/src` |
| 4 | FE↔API filter/apply contracts drift so the UI and API disagree on query meaning or payload shape | Medium | High | interview Q3; hot-spot dir `libs/shared/types/src`; tech-stack shared-types lock |
| 5 | Authenticated company hits 401/403 on own employer routes, or a guest reaches `/company/*` / company APIs | High | Medium | PRD Access Control; archive `gate-company-routes`; hot-spot auth churn under `apps/baza-api/src/app` / FE guards |
| 6 | Public apply-without-account is abused at scale (spam applications / costly private uploads) | Medium | Medium | PRD FR-006 / FR-009 (no driver account); abuse lens |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | After a successful apply, the owning company can list that application (contact + CV access path) | "HTTP 200 on apply implies inbox already works" | apply entry, persistence boundary, company-scoped list contract | API integration (optional later e2e for full loop) | Asserting current list-query implementation as oracle |
| #2 | Company B cannot download company A's CV; private objects are not served as public assets | "Logged in ⇒ can read any application/CV" | ownership checks, private vs public object policy, download authz | API integration (authz) | Happy-path download only |
| #3 | Fixed fixture offers + known filter inputs yield exactly the expected offer ID set | "Non-empty list means filters are correct" | filter query model, server-side filter semantics, shared query params | unit + API/FE integration on filter contract | Locking in today's buggy results |
| #4 | Same filter/apply fields mean the same thing on FE and API (shared contract) | "Typecheck green ⇒ product contract holds" | `@baza/shared-types` fields used by browse/apply | contract / shared-types tests | Snapshotting entire DTOs without business rules |
| #5 | Guest blocked from company surfaces; owning session allowed | "FE redirect alone is enough security" | company guards + API company auth boundary | unit (guards) + API auth integration | FE-only redirect tests |
| #6 | Abuse is limited or explicitly accepted for MVP with a documented follow-up (size/rate/monitoring) | "No driver accounts ⇒ no abuse surface" | apply endpoint limits, upload constraints, ops posture | document + targeted validation/limit tests when present | Full anti-bot e2e suite in MVP |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | Critical marketplace loop | Prove apply→inbox delivery and CV ownership isolation | #1, #2 | integration (+ e2e only if research shows cheaper layers miss the loop) | done | testing-critical-marketplace-loop |
| 2 | Offer filter & contract parity | Catch silent filter regressions and FE↔API contract drift | #3, #4 | unit + contract/integration | not started | — |
| 3 | Company auth & abuse floor | Lock guest/owner authz and make apply-abuse posture explicit | #5, #6 | unit + integration | not started | — |
| 4 | Quality-gates wiring | Keep lint/test/build as the merge floor; add critical-flow gate only when Phase 1 delivers it | cross-cutting | CI gates | not started | — |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.
Recommendations in this section must be grounded in local manifests/configs
plus the MCP/tools actually exposed in the current session. If a useful docs
or search MCP such as Context7 or Exa.ai is not available, say that instead
of assuming access.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + integration (API) | Jest via Nx | ~30.3 | `apps/baza-api` — `npx nx test baza-api` / `npm run test` |
| unit (FE) | Vitest via `@angular/build:unit-test` | ^4.0.8 | `apps/baza-frontend` — ~specs clustered in pages/guards |
| e2e | none yet | — | no Playwright config; add only if Phase 1 research requires full-loop signal |
| accessibility | none yet | — | not a top risk for this rollout |
| AI-native visual | deliberately skipped | — | excluded by interview Q5 (map/marketing snapshots) |

**Stack grounding tools (current session):**

- Docs: Context7 / framework docs MCP — not available in current session; checked: 2026-09-14
- Search: WebSearch available; Exa.ai — not available in current session; checked: 2026-09-14
- Runtime/browser: cursor-ide-browser — available for manual/agent smoke, not a CI gate yet; checked: 2026-09-14
- Provider/platform: Supabase MCP — advisors/logs possible for ops checks; GitHub via `gh` for CI; checked: 2026-09-14

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required for §3 Phase \<N\>" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint | local + CI (`npm run lint`) | required now | style / module-boundary drift |
| unit + integration (`npm run test`) | local + CI | required now; deepen after §3 Phase 1–3 | logic / authz / filter regressions as phases land |
| production build | local + CI (`npm run build`) | required now | bundle/budget and compile breaks |
| e2e on apply→inbox (if introduced) | CI on PR | required after §3 Phase 1 *only if* research chooses e2e | broken critical marketplace loop |
| visual / map snapshots | — | not planned | excluded (§7) |
| multimodal visual review | — | not planned | excluded (§7) |
| pre-prod smoke | optional / manual | optional | env-specific deploy issues |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase \<N\>."

### 6.1 Adding a unit test

- TBD — see §3 Phase 2 for filter/contract unit patterns; Phase 3 for guard patterns.

### 6.2 Adding an integration test

Use a **stateful in-memory Supabase double** so several service calls share fixture rows — not one-shot `mockImplementationOnce` chains.

1. Create/reuse `apps/baza-api/src/testing/stateful-supabase.mock.ts` via `createStatefulSupabaseMock()`.
2. Seed companies (`id`, `user_id`), published offers (`company_id`), then exercise the real Nest service under `Test.createTestingModule` with mocked R2.
3. Prefer a sibling `*.integration.spec.ts` next to the unit `*.spec.ts` so call-order unit mocks stay untouched.
4. **Oracle = fixture membership**, not re-asserting the list-query filter string:
   - After apply on company A's offer, `listForOwner(user-a)` contains the returned application id; `listForOwner(user-b)` does not.
5. Run with `npx nx test baza-api` (picked up by the default Jest target — no separate integration target).

Reference: `apps/baza-api/src/app/company/job-application.integration.spec.ts` (Risks #1/#2).

### 6.3 Adding an e2e test

- Not introduced for §3 Phase 1. Research chose stateful service integration over Playwright; revisit only if a future risk needs full browser signal the API layer cannot catch.

### 6.4 Adding a test for a new API endpoint

For company-scoped application / CV surfaces:

1. Seed two companies (A/B) and an offer owned by A in the stateful mock.
2. Drive the service methods that the controllers call (`applyToPublishedOffer`, `listForOwner`, `getCvStreamForOwner`) — HTTP/supertest is optional later.
3. Always assert:
   - Wire DTOs omit `cvFileKey` / `cv_file_key` on create and list.
   - Cross-tenant: `getCvStreamForOwner(user-b, app-from-a)` → `NotFoundException` and R2 `getPrivateObject` is **not** called.
   - Owner happy path: owning user streams CV; R2 key starts with `applications/{companyA}/`.
4. Keep existing unit authz cases in `job-application.service.spec.ts`; integration specs prove the apply→list/CV **chain**.

Private-bucket Cloudflare ACL remains ops/manual — not automated in this cookbook.

### 6.5 Adding a test for offer filter / shared contract changes

- TBD — see §3 Phase 2 for silent-filter-regression and FE↔API parity patterns.

### 6.6 Per-rollout-phase notes

- **§3 Phase 1 (`testing-critical-marketplace-loop`, 2026-09-14):** Stateful Supabase mock + `job-application.integration.spec.ts` cover apply→inbox (#1) and CV cross-tenant isolation (#2). No Playwright. Cookbook §6.2 / §6.4 filled from that change.
## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Future
contributors should respect these unless the underlying assumption changes.

- **Visual snapshots / layout tests for the route map and marketing-style screens** — high churn, low business-signal; they break without catching US-01 failures. Re-evaluate only if map correctness becomes a paid SLA. (Source: Phase 2 interview Q5.)
- **Payments / paid listings** — out of MVP (PRD Non-Goals). Re-evaluate if monetization ships.
- **Driver accounts / saved profiles** — out of MVP. Re-evaluate when driver auth lands.

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-09-14
- Stack versions last verified: 2026-09-14
- AI-native tool references last verified: 2026-09-14
- Cookbook §6.2 / §6.4 last filled: 2026-09-14 (§3 Phase 1)
Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
