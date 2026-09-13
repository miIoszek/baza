---
date: 2026-09-13T14:05:20+02:00
researcher: Cursor agent
git_commit: fafa2dae15ab7145ab506c84e72301c018e7e540
branch: feat/company-application-inbox
repository: miIoszek/baza
topic: "S-05 company application inbox — list applications + private CV access for owning company"
tags: [research, codebase, job-applications, company-inbox, r2-private, fr-005]
status: complete
last_updated: 2026-09-13
last_updated_by: Cursor agent
---

# Research: S-05 company application inbox

**Date**: 2026-09-13T14:05:20+02:00  
**Researcher**: Cursor agent  
**Git Commit**: fafa2dae15ab7145ab506c84e72301c018e7e540  
**Branch**: feat/company-application-inbox  
**Repository**: miIoszek/baza

## Research Question

What already exists after S-04 for driver applications, and what must S-05 build so a logged-in company can see applications in `/company/inbox` with contact info, optional message, and CV — without conflicting with parallel S-06 UX polish?

## Summary

S-04 already persists Nest-only `job_applications` (with denormalized `company_id`), uploads CVs to a **separate private R2 bucket**, and exposes only public `POST /api/offers/:id/applications`. There is **no** company list/get/CV-download API yet. FE has a gated `/company/inbox` **placeholder** and shell nav **without** an inbox link. S-05 should add company-scoped Nest endpoints + R2 GetObject (or proxy), replace the placeholder with a dedicated inbox page, and add shell nav — while leaving `job-offers-page*` (and preferably `company-offers-list-page*` polish) to S-06.

## Detailed Findings

### Data layer (`job_applications`)

- Table created in [`supabase/migrations/20260911210000_job_applications.sql`](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/supabase/migrations/20260911210000_job_applications.sql): `id`, `job_offer_id`, `company_id`, `email`, `phone`, `message`, `cv_file_key`, `consent_accepted_at`, `created_at`.
- RLS on; **anon/authenticated revoked**; **service_role** only — Nest is the only access path.
- Indexes on `company_id` and `job_offer_id` already suit inbox list-by-company.
- Phone tighten migrations: `20260911220000_*`, `20260911230000_*` (varchar 16 + digit CHECKs).
- **No status column** — PRD Socrates note about inbox statuses deferred; MVP is chronological list.
- Optional `message` already in schema (resolves PRD open Q4 for FR-005 “message” vs apply form).

### Apply write path (S-04 — keep intact)

- Public: `OffersPublicController.apply` → `POST /offers/:id/applications` in `apps/baza-api/src/app/company/offers-public.controller.ts`.
- `JobApplicationService.applyToPublishedOffer` copies `company_id` from the published offer (not from client) and stores private R2 key after `uploadApplicationCv`.
- Create response deliberately omits `cv_file_key` / URLs (`CreateJobApplicationResponse`).

### R2 private storage

- `R2StorageService`: `getPrivateConfig` / `isPrivateConfigured` / `uploadApplicationCv` / `deletePrivatePrefix` in `apps/baza-api/src/app/storage/r2-storage.service.ts`.
- Key shape: `applications/{companyId}/{offerId}/{versionId}/cv.pdf`.
- Guard: private bucket must ≠ public logo bucket.
- **Gap:** no `GetObject`, no streaming proxy, no presigner — download is entirely S-05.

### Company auth pattern to copy

- API: class-level `JwtAuthGuard` on `@Controller('company')`; ownership via `JobOfferService.requireCompanyForUser(userId)` then `.eq('company_id', company.id)` (see `listOwnOffers` / `listForOwner`).
- FE: `companyAuthGuard` + `authInterceptor` attaching Bearer to `/api/` URLs.

### Shared types

- `libs/shared/types/src/lib/application.ts`: `JobApplication` already marked “Internal / company-facing (S-05)” and includes `cvFileKey`.
- **Gap:** FE-facing list DTO should **not** expose raw storage keys; prefer download route (e.g. `GET /api/company/applications/:id/cv`) instead of returning keys to the browser.

### Frontend company shell

- Route `company/inbox` → `CompanyInboxPlaceholder` behind `companyAuthGuard` (`app.routes.ts` ~L67–69).
- Placeholder copy only: “Aplikacje kierowców — wkrótce.” (`company-inbox-placeholder.ts`).
- App shell (`libs/baza/ui/.../app-shell.html`) links profile / offers / new offer — **no inbox link**.
- List UX pattern to **copy into new files**: `company-offers-list-page` (loading signal, empty text, snackbar errors, HttpClient + `environment.apiBaseUrl`).

### Parallel S-06 conflict surface

| Safe for S-05 | Avoid / minimize (S-06) |
|---------------|-------------------------|
| New `company-inbox-page*` | `job-offers-page*` |
| `company-inbox-placeholder` replace | Heavy edits to `company-offers-list-page*` |
| `app.routes.ts` component swap for inbox | Browse empty/loading polish |
| `app-shell` inbox nav link | Application schema / private R2 upload path |
| Nest company applications + R2 get | Public apply / detail apply form |

## Code References

- `supabase/migrations/20260911210000_job_applications.sql:1-35` — Nest-only applications table
- `apps/baza-api/src/app/company/job-application.service.ts` — apply-only service today
- `apps/baza-api/src/app/company/offers-public.controller.ts` — public apply
- `apps/baza-api/src/app/storage/r2-storage.service.ts:69-308` — private upload/delete, no get
- `apps/baza-api/src/app/company/company.controller.ts` — JWT + company ownership pattern
- `libs/shared/types/src/lib/application.ts:38-72` — `JobApplication` + public create types
- `apps/baza-frontend/src/app/pages/company/company-inbox-placeholder.ts` — placeholder UI
- `apps/baza-frontend/src/app/app.routes.ts:67-69` — gated inbox route
- `libs/baza/ui/src/lib/app-shell/app-shell.html` — company nav without inbox
- `apps/baza-frontend/src/app/pages/company/company-offers-list-page.ts` — list pattern reference

## Architecture Insights

1. **Company scoping is denormalized** — filter inbox by `job_applications.company_id` after `requireCompanyForUser`; no join required for authorization.
2. **Never put private keys on the wire to FE** — serve CV through Nest after ownership check (stream PDF or short-lived signed URL from private bucket).
3. **Schema likely unchanged** for MVP list + CV download.
4. **Message field** already optional on apply and in DB — inbox can show empty message without a new apply change.

## Historical Context (from prior changes)

- `context/archive/2026-09-11-driver-apply-via-map/plan-brief.md` — CV download explicitly out of S-04; separate private bucket; optional message ≤2000 for FR-005 alignment.
- Same archive plan-review — critical finding that public logo bucket must not serve CVs; private bucket required.
- `context/foundation/lessons.md` — lock FE+BE+DB validation (less critical for read-only inbox; still apply if any new form fields).
- PRD FR-005 / US-01 — inbox with contact, message, CV; only receiving company sees applicant data.

## Related Research

- `context/archive/2026-09-11-driver-apply-via-map/research.md` — apply + private R2 foundations
- `context/archive/2026-09-08-gate-company-routes/` — company route gating (F-01)

## Open Questions

1. **CV delivery:** Nest stream proxy vs short-lived R2 presigned GET — both satisfy privacy if ownership-checked; proxy keeps bucket fully private (no browser→R2). Prefer proxy unless ops needs direct R2.
2. **List granularity:** flat company-wide list (newest first) vs grouped by offer — flat list is enough for north-star US-01; include `jobOfferId` + offer title via join if cheap.
3. **Detail route:** list-only + inline CV download vs `/company/inbox/:id` — list + per-row download matches FR-005 MVP.
4. **Empty inbox:** show Polish empty state on new page (S-05 owns inbox empty UX; S-06 owns browse/offer-list polish).
