---
date: 2026-09-14T18:12:38Z
researcher: Auto
git_commit: 5e535f0d872a23f8505ec94dde84f9073f2d0364
branch: main
repository: miIoszek/baza
topic: "Hard-delete company-owned job offers and associated CVs"
tags: [research, codebase, job-offers, job-applications, r2, hard-delete]
status: complete
last_updated: 2026-09-14
last_updated_by: Auto
---

# Research: Hard-delete company-owned job offers and associated CVs

**Date**: 2026-09-14T18:12:38Z
**Researcher**: Auto
**Git Commit**: 5e535f0d872a23f8505ec94dde84f9073f2d0364
**Branch**: main
**Repository**: miIoszek/baza

## Research Question

How should we implement **hard delete of a company’s own job offers**, including **deleting all assigned CVs** (private R2), given the current offer lifecycle, ownership patterns, and application storage?

**Locked scope (user):**
- Delete surface only (not a soft-vs-hard product debate).
- **Hard delete** of the offer row.
- Must also remove **all CVs** tied to applications for that offer when present.

## Summary

There is **no** offer delete API or UI today. Companies can create/edit/list offers and **soft-unpublish** (`PATCH …/unpublish` → `published: false`). That path is the best template for ownership checks.

**Database:** `job_applications.job_offer_id` references `job_offers(id) ON DELETE CASCADE`, so deleting an offer row already removes application **rows**. **Private R2 CV objects are not cascaded** — they would orphan under `applications/{companyId}/{offerId}/…` unless Nest calls `deletePrivatePrefix` first (or around delete).

**Recommended shape for planning:**
1. `DELETE /api/company/offers/:id` → `JobOfferService.deleteForUser` mirroring `unpublishForUser` (`requireCompanyForUser` + `getOwnedOffer`).
2. Before DB delete: `r2.deletePrivatePrefix(\`applications/${companyId}/${offerId}\`)` (best-effort, same helper used on failed apply).
3. Then `.from('job_offers').delete().eq('id').eq('company_id', …)` — DB cascades app rows.
4. FE: “Usuń” on company offers list next to Edytuj/Wycofaj (with confirm).

Historically hard delete was **explicitly deferred** (S-02/S-03) in favor of soft-unpublish; this change reopens that decision with a clear CV cleanup requirement.

## Detailed Findings

### Offer mutate surface (API)

Owned routes live on `CompanyController` (`JwtAuthGuard`, `@Controller('company')`):

| Route | Service | Notes |
|-------|---------|-------|
| `GET /api/company/offers` | `listForOwner` | owner list |
| `POST /api/company/offers` | `createForUser` | create |
| `PATCH /api/company/offers/:id` | `updateForUser` | update |
| `PATCH /api/company/offers/:id/unpublish` | `unpublishForUser` | soft hide |
| **DELETE** | — | **missing** |

Evidence: [company.controller.ts](https://github.com/miIoszek/baza/blob/5e535f0d872a23f8505ec94dde84f9073f2d0364/apps/baza-api/src/app/company/company.controller.ts) (offers routes through ~L158), [job-offer.service.ts `unpublishForUser`](https://github.com/miIoszek/baza/blob/5e535f0d872a23f8505ec94dde84f9073f2d0364/apps/baza-api/src/app/company/job-offer.service.ts#L162-L181).

Authz primitives already private on `JobOfferService`:
- `requireCompanyForUser` (~L316) — company by `user_id`
- `getOwnedOffer` (~L338) — offer by `id` + `company_id`; callers 404 with `Oferta nie znaleziona`

`JobOfferService` today depends on `SupabaseAuthService` only — **no `R2StorageService` injection** yet (unlike `JobApplicationService` / `CompanyService`). Delete will need R2 injected (or delegate cleanup to application/storage helper).

### Soft-unpublish contrast

`unpublishForUser` only sets `published: false`. Existing applications and CVs remain; public list/map hide the offer; new applies require published. Hard delete is a different product action (remove offer + apps + CVs).

### Frontend placement

Primary UX: company offers list actions.

- [company-offers-list-page.ts `unpublish`](https://github.com/miIoszek/baza/blob/5e535f0d872a23f8505ec94dde84f9073f2d0364/apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.ts#L44-L57) — pattern for HTTP + snackbar + reload
- [company-offers-list-page.html actions](https://github.com/miIoszek/baza/blob/5e535f0d872a23f8505ec94dde84f9073f2d0364/apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.html#L57-L66) — Edytuj always; Wycofaj if published → add **Usuń** for all statuses

Edit form page has create/update only — list is the natural delete entry point.

### Shared types / DTOs

`libs/shared/types/src/lib/job-offer.ts` — `JobOffer`, create/update requests; **no delete DTO needed** (empty body). Nest `CreateJobOfferDto` / `UpdateJobOfferDto` in `job-offer.dto.ts` likewise.

### Applications schema cascade

Migration [20260911210000_job_applications.sql](https://github.com/miIoszek/baza/blob/5e535f0d872a23f8505ec94dde84f9073f2d0364/supabase/migrations/20260911210000_job_applications.sql):

```sql
job_offer_id uuid not null references public.job_offers (id) on delete cascade,
company_id uuid not null references public.companies (id) on delete cascade,
cv_file_key text not null,
```

Deleting the offer row **removes application rows**. It does **not** touch R2.

### CV storage and cleanup APIs

Key layout ([r2-storage.service.ts](https://github.com/miIoszek/baza/blob/5e535f0d872a23f8505ec94dde84f9073f2d0364/apps/baza-api/src/app/storage/r2-storage.service.ts#L267-L269)):

```
applications/{companyId}/{offerId}/{versionId}/cv.pdf
```

Offer-scoped cleanup prefix: `applications/{companyId}/{offerId}` → `deletePrivatePrefix` lists with trailing `/` and batch-deletes ([L302–311](https://github.com/miIoszek/baza/blob/5e535f0d872a23f8505ec94dde84f9073f2d0364/apps/baza-api/src/app/storage/r2-storage.service.ts#L302-L311)).

Important behaviors:
- **Best-effort**: errors logged (+ Sentry where wired); often **no throw** on cleanup failure.
- No single-key public delete API — prefix delete only.
- ListObjectsV2 is single-page (fine for typical CV counts per offer).
- If private R2 not configured: `deletePrivatePrefix` no-ops (same as other cleanup paths).

Existing compensation patterns to mirror:
- Failed apply after upload: `JobApplicationService` → `deletePrivatePrefix(uploaded.prefix)` (~L118)
- Failed register / company logo replace: prefix delete then continue

**Ordering recommendation:** R2 prefix delete **before** DB offer delete so keys are known and apps still exist for audit if needed; DB cascade then drops rows. If R2 fails best-effort, plan should decide: still delete DB (risk orphan files) vs fail the request (stricter GDPR alignment with user “must delete CVs”).

### Tests to mirror

| File | Useful precedent |
|------|------------------|
| `job-offer.service.spec.ts` | `updateForUser` 404 when offer not owned |
| `job-application.service.spec.ts` | R2 cleanup on insert failure; CV cross-tenant 404 |
| `company-offers-list-page.spec.ts` | list load only today — extend for DELETE + reload |
| `company.controller.spec.ts` | mocks mutate methods but does not assert routes |

No `unpublishForUser` unit tests today — delete should not inherit that gap.

### Lessons prior

`context/foundation/lessons.md`: form-field FE/BE/DB validation lock — low relevance for delete (no form fields); confirm dialog copy still worth Polish UX consistency.

## Code References

- `apps/baza-api/src/app/company/company.controller.ts` — owned offer routes; unpublish at ~L152–158
- `apps/baza-api/src/app/company/job-offer.service.ts:162-181` — `unpublishForUser` template
- `apps/baza-api/src/app/company/job-offer.service.ts:316-350` — ownership helpers
- `apps/baza-api/src/app/company/job-application.service.ts:48-122` — apply + R2 compensate
- `apps/baza-api/src/app/storage/r2-storage.service.ts:244-312` — CV upload key layout + `deletePrivatePrefix`
- `supabase/migrations/20260911210000_job_applications.sql:5` — `ON DELETE CASCADE`
- `apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.ts:44-57` — unpublish HTTP pattern
- `apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.html:57-66` — actions UI

## Architecture Insights

1. **Nest is the authorization gate** (JWT + `company_id` filters); PostgREST RLS on core tables is revoked for anon/authenticated — service_role from Nest.
2. **Soft and hard are separate:** unpublish keeps data for employer history/inbox; hard delete destroys offer + apps + should destroy CVs.
3. **Storage lifecycle is app-owned:** DB FKs never clean object storage; every create path that writes R2 already has a compensate-delete — delete-offer must join that family.
4. **Inject R2 into offer service** (or a small shared “purge offer storage” helper) — avoids duplicating key-prefix knowledge outside `R2StorageService`.

## Historical Context (from prior changes)

- `context/archive/2026-09-10-publish-job-offer/` — lifecycle locked to create + edit + **soft-unpublish**; **hard delete explicitly out of scope**.
- `context/archive/2026-09-11-driver-browse-job-offers/` — again lists hard delete as out of scope.
- `context/archive/2026-09-11-driver-apply-via-map/` — private R2 for CVs; orphan cleanup only on **failed apply**.
- `context/archive/2026-09-13-company-application-inbox/` — Nest CV stream; prefix `applications/{companyId}/…`; no offer-delete retention story.
- `context/foundation/prd.md` — CV isolation guardrail; NFR about **account** delete / personal data (not offer delete).
- `context/foundation/test-plan.md` — Risks #1/#2 (inbox + CV isolation) remain relevant; hard delete should not weaken isolation mid-flight and should not leave private objects behind.

## Related Research

- Active change folder: `context/changes/delete-own-job-offers/` (this document).
- No prior `research.md` dedicated to offer hard-delete; closest are publish-job-offer and driver-apply archive plans.

## Open Questions

1. **R2 failure policy:** If `deletePrivatePrefix` fails (or private R2 unset), should API still delete the DB row (accept possible orphans) or return 5xx and keep the offer? User said CVs **must** be deleted — stricter path favors fail-closed when private R2 is configured and delete errors.
2. **Confirm UX:** browser `confirm()` vs Material dialog; irreversible copy mentioning applications/CVs.
3. **Keep unpublish?** Likely yes (softer action); delete is additional destructive action — confirm in plan.
4. **Inbox empty state** after deleting offers that had applications — no schema work; FE list already loads from remaining apps.
5. **Module DI:** ensure `R2StorageService` is available to `JobOfferService` via existing company/storage module wiring.
