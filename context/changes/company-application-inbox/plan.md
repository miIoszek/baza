# Company Application Inbox (S-05) Implementation Plan

## Overview

Let a logged-in transport company view driver applications in `/company/inbox` (email, phone, optional message, offer context) and download the private PDF CV through Nest after company-ownership checks — closing FR-005 / US-01. Parallel S-06 owns browse + company offer-list polish; this change must not edit those surfaces.

## Current State Analysis

- S-04 shipped Nest-only `job_applications` (`company_id` denormalized), private R2 CV upload (`R2_PRIVATE_BUCKET` ≠ public logo bucket), and public `POST /api/offers/:id/applications`. Create response omits CV keys.
- `JobApplicationService` is apply-only; `R2StorageService` has private put/deletePrefix but **no GetObject**.
- Company API pattern: `JwtAuthGuard` on `@Controller('company')` + `requireCompanyForUser` / `listForOwner` on offers (`company.controller.ts`).
- FE: `/company/inbox` → `CompanyInboxPlaceholder` behind `companyAuthGuard`; app shell links profile / offers / new — **no inbox**.
- Shared `JobApplication` includes `cvFileKey` (internal); no list DTO safe for FE.
- Research open questions resolved for this plan: Nest stream proxy; flat newest-first list; no detail route; inbox owns its empty/loading/error UX.

### Key Discoveries

- `apps/baza-api/src/app/company/job-application.service.ts` — extend with list + getForOwner
- `apps/baza-api/src/app/storage/r2-storage.service.ts` — add private `getObject` / stream helper
- `apps/baza-api/src/app/company/company.controller.ts` — add `GET applications` + `GET applications/:id/cv`
- `libs/shared/types/src/lib/application.ts` — add FE-facing list item type without key
- `apps/baza-frontend/src/app/pages/company/company-inbox-placeholder.ts` — replace
- `libs/baza/ui/src/lib/app-shell/app-shell.html` — inbox nav link
- Pattern reference (do not polish for S-06): `apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.*`

## Desired End State

Company user opens Skrzynka z aplikacji, sees newest-first applications for their company with email, phone, optional message, offer title (or id fallback), createdAt, and a CV download control. Download returns `application/pdf` only after Nest confirms the application’s `company_id` matches the caller’s company. Anonymous and other companies get 401/404. Empty inbox shows a clear Polish empty state on the new page.

### Verification sketch

- Automated: Nest unit tests for list scoping + CV ownership; FE component/guard smoke; lint/test/build
- Manual: apply as driver → login as company → see row → download PDF; second company cannot access

## What We're NOT Doing

- Application status workflow / read-unread
- Driver accounts or application tracking
- Presigned R2 URLs or exposing `cv_file_key` to the browser
- Editing `job-offers-page*` or S-06-owned empty/loading polish on company offers list
- Changing public apply, private upload, or schema CHECKs
- Pagination / filters beyond newest-first (add later if volume hurts)

## Implementation Approach

Two phases: (1) shared list types + Nest company applications list + private CV stream with ownership tests; (2) replace inbox placeholder, shell nav, FE HTTP wiring. Copy list UX patterns into **new** `company-inbox-page*` files only.

## Critical Implementation Details

**Ownership:** duplicate a thin **private** `requireCompanyForUser(userId)` on `JobApplicationService` using the same Supabase `companies` query as `JobOfferService` (`job-offer.service.ts` ~297). Do **not** call `JobOfferService.requireCompanyForUser` — it is private and not injectable across services. Always `.eq('company_id', company.id)` on list and get-by-id. CV download: load application by id **and** company_id; 404 if missing (do not leak existence across companies).

**CV stream:** `R2StorageService.getPrivateObject(key)` using `GetObjectCommand` from existing `@aws-sdk/client-s3` (greenfield — no prior Nest binary-download pattern). If private config missing → `ServiceUnavailableException`. If GetObject succeeds but `Body` is missing/empty → treat as not found (`NotFoundException`). Otherwise wrap the AWS SDK body as a Node `Readable` and return Nest `StreamableFile` with `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="cv.pdf"`, `Cache-Control: private, no-store`. Never use `R2_PUBLIC_URL`.

**List DTO:** e.g. `CompanyJobApplicationListItem` — `id`, `jobOfferId`, `jobOfferTitle` (nested Supabase select `job_offers(title)` — house pattern), `email`, `phone`, `message?`, `createdAt`. **No** `cvFileKey`, **no** `hasCv` (schema already requires CV), **no** `companyId` required on FE (optional omit).

**Routes:**
- `GET /api/company/applications` → list
- `GET /api/company/applications/:id/cv` → PDF stream

**Controller DI:** `CompanyController` must newly inject `JobApplicationService` (today only Auth / Company / JobOffer). Update `company.controller.spec.ts` mocks accordingly.

**FE:** `HttpClient` + auth interceptor (same as offers list); open CV via authenticated blob download (`responseType: 'blob'`) then object URL / save — do not navigate bare `<a href>` without Bearer. Auth interceptor already covers any `/api/` URL including blob responses (no in-repo download precedent — implement once on inbox page).

**S-06 fence:** touch `app.routes.ts` only to swap inbox component import; touch `@baza/ui` app-shell for one nav link; do not edit browse/job-offer detail apply UX.

---

## Phase 1: Company applications API + private CV download

### Overview

Shared FE-safe list types; Nest list + CV endpoints with ownership; R2 GetObject; unit tests.

### Changes Required

#### 1. Shared types

**File:** `libs/shared/types/src/lib/application.ts` (+ barrel if needed)

**Intent:** Add `CompanyJobApplicationListItem` (and optional list alias) without storage keys or `hasCv`. Keep internal `JobApplication` as-is for Nest mapping.

#### 2. R2 private get

**File:** `apps/baza-api/src/app/storage/r2-storage.service.ts` (+ spec if present)

**Intent:** `getPrivateObject(key): Promise<{ body: Readable; contentType?: string; contentLength?: number }>` using private config; throw service unavailable if private not configured; map missing object to not-found at service or caller.

#### 3. JobApplicationService list + get

**File:** `apps/baza-api/src/app/company/job-application.service.ts` (+ `job-application.service.spec.ts`)

**Intent:**
- `listForOwner(userId): Promise<CompanyJobApplicationListItem[]>` — resolve company, select applications for `company_id` ordered by `created_at desc`, join/fetch offer titles.
- `getCvStreamForOwner(userId, applicationId)` — ownership-scoped row → R2 get by `cv_file_key`.

#### 4. Company controller endpoints

**File:** `apps/baza-api/src/app/company/company.controller.ts` (+ controller/service specs)

**Intent:** Under existing `JwtAuthGuard`:
- `GET company/applications`
- `GET company/applications/:id/cv` with `ParseUUIDPipe`, return streamable PDF

Polish error messages where user-facing (404 “Nie znaleziono aplikacji”).

#### 5. Module wiring

**File:** `apps/baza-api/src/app/company/company.module.ts`

**Intent:** Ensure `JobApplicationService` + storage already imported; no public controller changes.

### Success Criteria

- Unit tests: company A list excludes company B rows; CV for foreign id → 404; happy path returns stream mock
- Apply path unchanged; no schema migration

---

## Phase 2: Inbox UI + shell navigation

### Overview

Replace placeholder with real inbox page; add shell link; wire authenticated list + CV download.

### Changes Required

#### 1. Inbox page

**Files:**
- Add `apps/baza-frontend/src/app/pages/company/company-inbox-page.ts|html|scss` (+ optional `.spec.ts`)
- Remove or stop using `company-inbox-placeholder.ts` (delete after route swap)

**Intent:** Loading / empty (“Brak aplikacji…”) / error (snackbar) / list rows showing email, phone, message (if any), offer title, date, “Pobierz CV” button. Mirror offers-list patterns without editing that page.

#### 2. Routes

**File:** `apps/baza-frontend/src/app/app.routes.ts`

**Intent:** Point `company/inbox` at `CompanyInboxPage`; keep `companyAuthGuard`.

#### 3. App shell nav

**File:** `libs/baza/ui/src/lib/app-shell/app-shell.html` (and any related i18n/a11y labels)

**Intent:** When logged in, add link “Skrzynka” / “Aplikacje” → `/company/inbox` with `routerLinkActive` (place near Moje oferty).

#### 4. CV download client

**File:** inbox page TS (inline HttpClient is fine; thin service optional)

**Intent:** `GET ${apiBaseUrl}/company/applications/:id/cv` with `responseType: 'blob'`, then trigger download; surface Polish error on failure.

### Success Criteria

- Manual: driver apply → company sees row → PDF downloads
- Guard still redirects anonymous `/company/inbox` → login with returnUrl
- No edits under `pages/job-offers/`

---

## Testing Strategy

- **Automated:** Nest service/controller ownership + stream; FE inbox page load/empty if cheap; `nx lint/test/build` for api + frontend
- **Manual:** full US-01 path company side; cross-company negative; empty inbox

## Migration / Rollback Notes

- No DB migration. Rollback = revert Nest/FE/shell; data rows and private R2 objects remain (harmless).

## References

- Research: `context/changes/company-application-inbox/research.md`
- Brief: `context/changes/company-application-inbox/plan-brief.md`
- Prior: `context/archive/2026-09-11-driver-apply-via-map/`
- PRD: FR-005, US-01; roadmap S-05 ∥ S-06
- Lesson: FE+BE+DB validation (N/A for read-only; keep Polish user-facing errors)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Company applications API + private CV download

#### Automated

- [x] 1.1 Shared `CompanyJobApplicationListItem` type (no cvFileKey) — a908b9e
- [x] 1.2 R2 `getPrivateObject` for private bucket — a908b9e
- [x] 1.3 JobApplicationService listForOwner + getCvStreamForOwner — a908b9e
- [x] 1.4 GET /api/company/applications and GET …/:id/cv — a908b9e
- [x] 1.5 Nest ownership / 404 unit tests — a908b9e
- [x] 1.6 API lint + test + build green — a908b9e

#### Manual

- [x] 1.7 Smoke list + CV with real token + private R2 (optional mid-slice)

### Phase 2: Inbox UI + shell navigation

#### Automated

- [x] 2.1 CompanyInboxPage with loading/empty/error/list — 1463a34
- [x] 2.2 Wire route; remove placeholder — 1463a34
- [x] 2.3 App shell inbox nav link — 1463a34
- [x] 2.4 Authenticated blob CV download — 1463a34
- [x] 2.5 Frontend lint + test + build green — 1463a34

#### Manual

- [x] 2.6 Driver apply → company inbox → download CV
- [x] 2.7 Other company / anon cannot access CV
