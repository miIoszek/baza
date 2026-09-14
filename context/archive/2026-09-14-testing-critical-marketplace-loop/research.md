---
date: 2026-09-14T09:39:50+02:00
researcher: Cursor agent
git_commit: f9b5b2d9c7bf779de788beb5f72283be87b7cdee
branch: main
repository: baza
topic: "Ground test-plan Phase 1 Risks #1/#2 — apply→inbox delivery and CV ownership isolation"
tags: [research, codebase, job-applications, inbox, r2, authz, testing]
status: complete
last_updated: 2026-09-14
last_updated_by: Cursor agent
---

# Research: Critical marketplace loop (Risks #1 / #2)

**Date**: 2026-09-14T09:39:50+02:00  
**Researcher**: Cursor agent  
**Git Commit**: `f9b5b2d9c7bf779de788beb5f72283be87b7cdee`  
**Branch**: main  
**Repository**: baza

## Research Question

Ground rollout Phase 1 of `context/foundation/test-plan.md` for Risks #1 and #2:

1. Prove owning company lists the application after apply; challenge "200 on apply ⇒ inbox OK"; avoid mirroring list-query as oracle.
2. Prove company B cannot download company A's CV / private objects are not public; challenge "logged in ⇒ any CV"; avoid happy-path-only download tests.

Recommend cheapest useful test layer and what existing tests already cover.

## Summary

The marketplace loop is already implemented end-to-end in product code:

- **Apply** is public `POST /api/offers/:id/applications` → persists `job_applications` with `company_id` copied from the published offer, CV in a **private** R2 bucket under `applications/{companyId}/…`.
- **Inbox** is JWT `GET /api/company/applications` filtered by the caller's company; CV download is `GET /api/company/applications/:id/cv` with ownership + key-prefix checks.
- **`cvFileKey` is not returned** on create or list wire DTOs.

**Test gap:** Nest/FE unit suites cover service-level CV authz and DTO shape, but **do not** close the apply→inbox loop or prove cross-tenant HTTP isolation. A regression that returns 201 without a company-scoped listable row would still pass CI. Cheapest next layer: **API integration** (supertest + real/test DB or carefully asserted service contracts that include insert args + list filter). Browser e2e is **not** required for Phase 1 unless UI download UX is in scope.

## Detailed Findings

### Risk #1 — Apply → inbox delivery

#### Public apply entry

- Controller: `OffersPublicController.apply` — no JWT; throttle 10/min; multipart `cv` ([offers-public.controller.ts](https://github.com/miIoszek/baza/blob/f9b5b2d9c7bf779de788beb5f72283be87b7cdee/apps/baza-api/src/app/company/offers-public.controller.ts)).
- Route: `POST /api/offers/:id/applications` (global prefix `api` in `main.ts`).
- DTO: `CreateJobApplicationDto` — email, phone, optional message, `consentAccepted === true`.

#### Persistence boundary

- `JobApplicationService.applyToPublishedOffer` loads published offer, uploads CV, inserts into `job_applications` with `job_offer_id` + `company_id` from the offer ([job-application.service.ts](https://github.com/miIoszek/baza/blob/f9b5b2d9c7bf779de788beb5f72283be87b7cdee/apps/baza-api/src/app/company/job-application.service.ts)).
- Schema: `supabase/migrations/20260911210000_job_applications.sql` — both FKs required; `cv_file_key` NOT NULL.
- Compensation: insert failure after R2 upload triggers private prefix delete — apply does not return success without a row.

#### Company-scoped list

- `CompanyController.listApplications` behind `JwtAuthGuard` → `listForOwner(userId)` → resolve company by `user_id` → `.eq('company_id', company.id)` ([company.controller.ts](https://github.com/miIoszek/baza/blob/f9b5b2d9c7bf779de788beb5f72283be87b7cdee/apps/baza-api/src/app/company/company.controller.ts), service list path).
- Wire type `CompanyJobApplicationListItem` has contact fields but **no** `cvFileKey` ([application.ts](https://github.com/miIoszek/baza/blob/f9b5b2d9c7bf779de788beb5f72283be87b7cdee/libs/shared/types/src/lib/application.ts)).

#### FE surfaces

- Apply: `/job-offers/:id` → `JobOfferDetailPage` POST to apply API.
- Inbox: `/company/inbox` (`companyAuthGuard`) → GET list + GET CV blob.

#### Gap for tests

Owning-company happy path is consistent in production code (same `company_id` on insert and list filter). Automated tests never assert that chain:

- Apply specs mock insert return shape; they do **not** inspect insert payload `company_id`.
- `listForOwner` maps one mocked row; does not seed foreign-company rows or assert the `.eq('company_id', …)` filter.
- FE apply and inbox specs are independent HTTP mocks.

**What would prove protection:** After apply for offer owned by company A, A's list contains that application id (and contact fields); B's list does not. Oracle = fixture ownership + expected id membership, **not** "whatever the current mapper returns."

### Risk #2 — CV / contact isolation

#### Private vs public storage

- CV keys: `applications/{companyId}/{offerId}/{uuid}/cv.pdf` via `putPrivate` / `R2_PRIVATE_BUCKET`, `Cache-Control: private, no-store` ([r2-storage.service.ts](https://github.com/miIoszek/baza/blob/f9b5b2d9c7bf779de788beb5f72283be87b7cdee/apps/baza-api/src/app/storage/r2-storage.service.ts)).
- Logos: public bucket + `R2_PUBLIC_URL` under `companies/{id}/logos/…`.
- Misconfig guard: private bucket must differ from public bucket (null config + unit test).

#### Download authz

`getCvStreamForOwner`:

1. Company for JWT user.
2. Application row with matching `id` **and** `company_id`.
3. Key must start with `applications/${company.id}/`.
4. Stream via Nest from private GetObject — no public URL on wire.

Endpoint: `GET /api/company/applications/:id/cv` (`Cache-Control: private, no-store`).

#### Wire leakage

- Create select and list mapper omit `cv_file_key`.
- Shared create/list types deliberately exclude CV key.
- Contact email/phone **are** on inbox list (owner-only by company filter).

#### Existing authz tests (unit)

| Case | Coverage |
|------|----------|
| Foreign application id → 404, no R2 get | `job-application.service.spec.ts` |
| Prefix mismatch → 404 | same |
| Owned stream OK | same |
| Private ≠ public bucket | `r2-storage.service.spec.ts` |
| Controller CV download | happy-path only; `JwtAuthGuard` stubbed always-true |

**Residual:** HTTP-level company B JWT → A's CV id; assertion that CV is not reachable via public object URL (ops/manual historically).

**What would prove protection:** Company B JWT gets 404 on A's `/applications/:id/cv` and R2 get is not invoked; create/list JSON never contains `cvFileKey`/`cv_file_key`. Challenge "any logged-in company can download."

### Cheapest layer recommendation

| Option | Catches #1 | Catches #2 | Cost |
|--------|------------|------------|------|
| More service unit mocks | Weak (easy to mirror implementation) | Already mostly covered | Low / low signal for #1 |
| **API integration (Nest + test DB or controlled doubles asserting insert+list)** | **Strong** | **Strong at HTTP boundary** | **Medium — recommended** |
| Browser e2e | Strong UX loop | Partial (blob download) | High — defer unless research later needs FE |

Phase 1 should **not** introduce Playwright solely for these risks. Optional later e2e only if cookbook needs full-loop CI smoke.

### Speculative risks (challenger)

- "Apply succeeds without inbox row" is **not** true in happy-path code (insert before 201); the testable risk is **regression of company_id linkage / list filter**, not inventing a missing safeguard.
- Cloudflare making the private bucket world-readable is **ops/config**; app tests can only assert private client path + bucket-separation config, not account ACL.

## Code References

- `apps/baza-api/src/app/company/offers-public.controller.ts` — public apply
- `apps/baza-api/src/app/company/job-application.service.ts` — apply, listForOwner, getCvStreamForOwner
- `apps/baza-api/src/app/company/company.controller.ts` — JWT list + CV download
- `apps/baza-api/src/app/storage/r2-storage.service.ts` — private CV vs public logos
- `libs/shared/types/src/lib/application.ts` — wire DTOs without cvFileKey
- `apps/baza-api/src/app/company/job-application.service.spec.ts` — unit authz + apply shape
- `apps/baza-frontend/src/app/pages/company/company-inbox-page.ts` — inbox FE
- `apps/baza-frontend/src/app/pages/job-offers/job-offer-detail-page.ts` — apply FE
- `supabase/migrations/20260911210000_job_applications.sql` — persistence schema

## Architecture Insights

- Company scoping is **server-derived from offer ownership**, never client-supplied `company_id` on apply.
- Privacy model is **separate private bucket + Nest proxy**, not signed public URLs for CV.
- FE is a thin client; the oracle for Phase 1 lives at the **API/service boundary**.

## Historical Context (from prior changes)

- `context/archive/2026-09-11-driver-apply-via-map/` — introduced apply + private R2; company download deferred; manual check that CV is not on public URL.
- `context/archive/2026-09-13-company-application-inbox/` — inbox list + CV stream; success criteria include company A excludes B and foreign CV → 404; automated ownership units + manual apply→inbox→CV smoke.
- `context/foundation/test-plan.md` Phase 1 — same risks; cost × signal prefers integration over e2e.

## Related Research

- None under this change previously; archive plans above are the primary historical sources.

## Open Questions

1. Prefer Nest **supertest against a real test Supabase** vs richer mocked service tests that assert insert args + list filter invocation — pick in `/10x-plan` based on local test infra cost.
2. Whether Phase 1 should add one **controller-level** foreign-CV case with a non-stubbed auth path, or fold that into integration only.
3. Document-only acceptance for "private bucket ACL in Cloudflare" (ops) vs any automated check — recommend document in cookbook, not e2e.
