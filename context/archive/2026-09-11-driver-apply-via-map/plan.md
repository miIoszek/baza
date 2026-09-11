# Driver Apply via Map (S-04) Implementation Plan

## Overview

Enable drivers to open a published job offer, see company base pin plus route polylines with arrowheads on a map, and apply without an account (email, phone, PDF CV, optional message, required GDPR consent). Persist applications with a private R2 CV key for S-05 inbox later — no company download in this change.

## Current State Analysis

- Public detail page and `GET /api/offers/:id` exist; job info and text routes render; no map, no apply form.
- Browse already uses Leaflet pin-only `OffersMapComponent` and ≥768px list+map layout.
- `COUNTRIES` has no centroids; no geo API.
- Shared `JobApplication` / `CreateJobApplicationRequest` stubs exist; no DB table, Nest apply API, or FE form.
- R2 supports public company logos only (`uploadCompanyLogo` + `R2_PUBLIC_URL`); unsuitable for CVs.
- Nest already rejects publish without company `base_lat`/`base_lng` via `assertCanPublish` in `job-offer.service.ts` — Phase 3 hardens FE messaging around that gate, not a greenfield backend rule.
- Product locks (research follow-up + planning): map pin **and** route lines; optional `message`; CV upload-only in S-04; throttle apply+register; PDF ≤5 MB; required consent checkbox; inline success UX; `leaflet-polylinedecorator`; allow duplicate applications; centroids via Nest `GET /api/geo/countries`.

### Key Discoveries:

- `apps/baza-frontend/src/app/pages/job-offers/job-offer-detail-page.*` — detail shell to extend
- `apps/baza-frontend/src/app/pages/job-offers/offers-map.ts` — pin-only; keep browse contract; add route map path separately or optional inputs
- `apps/baza-api/src/app/storage/r2-storage.service.ts` — reuse client/put/deletePrefix; new private CV method without public URL requirement for that path
- `apps/baza-api/src/app/company/job-offer.service.ts` — `assertCanPublish` already enforces coords on publish
- Lesson: lock validation FE + BE + DB for all apply fields

## Desired End State

A driver can open `/job-offers/:id`, see offer details beside (desktop) or above (mobile) a map with company base pin and from→to polylines with arrowheads, submit apply with email/phone/PDF/consent/(optional message), see inline success, and the row+private CV key exist in Nest-only DB/R2 for S-05. Publishing without company coordinates is blocked in FE (disabled control + profile guidance) and remains blocked by Nest `assertCanPublish`.

### Verification sketch:

- Automated: lint, unit tests (API apply/geo/publish gate, FE form/map helpers), build
- Manual: apply happy path + validation errors; map pin+arrows; publish without coords blocked in UI

## What We're NOT Doing

- Company inbox UI or authenticated CV download (S-05)
- Driver accounts / application tracking
- Public CV URLs or public Cache-Control on CV objects
- Changing browse pin-only map semantics
- Pin clustering, paid listings, chat
- Strict per-route-only throttling without a high default safety net (see Addendum)
- DOCX/other non-PDF CVs

## Implementation Approach

Three phases matching S-03: (1) schema + private CV + public apply POST + throttle + consent persistence, (2) geo centroids API + detail route map with decorator, (3) apply form on detail + FE publish-gate clarity. Shared-types first; Nest `service_role` only; Polish 400 messages; orphan R2 cleanup on failed insert.

## Critical Implementation Details

**Private R2 config:** CV objects live in a **separate private R2 bucket/binding** (not on the public logo custom domain). Add env for private credentials/bucket (e.g. `R2_PRIVATE_*` or documented equivalent). **Refactor contract:** replace single `getConfig()` with `getPublicConfig()` (account/keys/public bucket + required `R2_PUBLIC_URL`, used by logos) and `getPrivateConfig()` (account/keys/private bucket only — **no** public URL, used by `uploadApplicationCv` + private `deletePrefix`). Keep `isConfigured()` for logos/public; add `isPrivateConfigured()` (or equivalent) for apply. Store only `cv_file_key` in DB; never return a browsable CV URL from apply response. S-05 will be the sole authenticated download path.

**Map library:** add `leaflet-polylinedecorator` for arrowheads; keep OSM tiles; do not break browse `markers`-only input.

**Publish gate:** backend already throws on publish without coords — Phase 3 ensures company offer form surfaces that error and guides profile lat/lng; do not weaken `assertCanPublish`.

**Addendum (impl-review F1):** Nest uses a global `ThrottlerGuard` with a **high per-IP default** (120/min) as a safety net on all routes. Apply and register keep a **stricter** `@Throttle(10/min)`. This is intentional — not a shared global quota across all users.
---

## Phase 1: Apply API + private CV storage

### Overview

Persist driver applications via public multipart POST, private R2 CV keys, Nest-only table, throttle on apply+register, and FE/BE/DB validation including required consent.

### Changes Required:

#### 1. Shared types

**File**: `libs/shared/types/src/lib/application.ts` (and barrel)

**Intent**: Extend apply contracts for consent and wire-safe create/response shapes used by Nest and Angular.

**Contract**: `CreateJobApplicationRequest` includes `email` (≤254), `phone` (≤16 chars, 9–15 digits after strip; optional country prefix), optional `message` (≤2000 when present), required consent via multipart (`'true'` / `'1'` / boolean true only). `JobApplication` (or create response) includes ids, contact fields, optional message, `createdAt` — **no** public CV URL; may omit `cvFileKey` from public create response if preferred (company-only later). Keep `cvFileKey` on internal/company-facing type for S-05. Mirror the same max lengths in Nest `class-validator` DTOs and DB CHECKs (lesson: FE + BE + DB).

#### 2. Migration

**File**: `supabase/migrations/<ts>_job_applications.sql`

**Intent**: Create Nest-only `job_applications` (or `applications`) table with FKs to offer + company, length CHECKs, revoke anon/authenticated like offers.

**Contract**: Columns at minimum: `id`, `job_offer_id`, `company_id`, `email` (varchar ≤254), `phone` (varchar ≤16), `message` nullable (≤2000), `cv_file_key`, `consent_accepted_at` (timestamptz, required — set only when consent accepted), `created_at`. CHECKs enforce those lengths plus phone digit/format rules. No unique on `(offer_id, email)`. Indexes for company/offer lookups for S-05.

#### 3. Private CV upload

**File**: `apps/baza-api/src/app/storage/r2-storage.service.ts`

**Intent**: Add private CV put + prefix delete against the **private** R2 bucket; PDF allowlist; no public URL construction.

**Contract**: e.g. `uploadApplicationCv(companyId, offerId, file) → { key }`; key prefix `applications/{companyId}/{offerId}/{uuid}/…`; uses **`getPrivateConfig()` / private S3 client only** (never `getPublicConfig`); `Content-Type: application/pdf`; max 5 MB enforced at multer + service; compensate with private-bucket `deletePrefix` on failure paths. Document new env vars in `.env.example` (names only). Unit-test: private upload does not require `R2_PUBLIC_URL`.

#### 4. Apply Nest module surface

**Files**: new DTO + service methods; wire on public offers controller (or dedicated public applications controller under `company/`)

**Intent**: `POST /api/offers/:id/applications` multipart: fields + `cv` file; resolve `company_id` from published offer; upload then insert with orphan cleanup; Polish errors.

**Contract**: Unguarded route; 404 if offer missing/unpublished; 400 validation (email/phone/message lengths, PDF only ≤5 MB, consent required); success 201 with application summary without CV URL. Throttle apply + register (e.g. `@nestjs/throttler` on those routes only). Multer → `BadRequestException` for size/MIME. Consent: accept only `'true'`/`'1'`/`true`; on accept set `consent_accepted_at = now()`.

#### 5. Tests

**Files**: Nest specs for DTO, service apply happy/error/orphan paths, throttle smoke if practical

**Intent**: Lock validation and privacy invariants before FE.

**Contract**: Cover missing consent, non-PDF, oversize, unpublished offer, duplicate allowed (second POST succeeds).

### Success Criteria:

#### Automated Verification:

- Migration file present; `supabase db push` (or project equivalent) applies cleanly
- `npm run lint` passes
- `npx nx test baza-api` passes (apply + storage-related cases)

#### Manual Verification:

- HTTP: multipart apply to published offer → 201; row in DB; CV object exists under private key (not fetchable via public R2 URL)
- HTTP: missing consent / non-PDF / unpublished offer → Polish 400/404
- Confirm register + apply are rate-limited under burst

**Implementation Note**: Pause for manual confirmation before Phase 2.

---

## Phase 2: Geo centroids API + detail route map

### Overview

Serve country centroids from Nest and render detail map: company base pin + route polylines with arrowheads; responsive layout aligned with browse.

### Changes Required:

#### 1. Centroid data + `GET /api/geo/countries`

**Files**: Nest geo controller/module (or thin controller under existing API); centroid source module (JSON or TS map keyed by `COUNTRY_CODES`)

**Intent**: Public read of allowlisted country codes with `lat`/`lng` for FE polylines.

**Contract**: Response list `{ code, namePl?, lat, lng }[]` covering shared `COUNTRY_CODES`. 200 public, no auth. Keep source maintainable (single module); FE does not hardcode coordinates.

#### 2. Detail map component

**Files**: extend or add sibling under `apps/baza-frontend/src/app/pages/job-offers/` (prefer not breaking browse `OffersMapComponent` pin-only API); add `leaflet-polylinedecorator` dependency + styles as needed

**Intent**: Show base pin when `baseLocation` present; draw each `routes[]` leg as polyline between centroid(s) with arrowheads; fit bounds to visible geometry.

**Contract**: Inputs: optional `baseLocation`, `routes: RouteDirection[]`, centroids map/list. Skip legs whose codes lack centroids; if zero geometry, hide map pane (graceful). Escape any popup HTML.

#### 3. Detail page layout

**Files**: `job-offer-detail-page.html` / `.scss` / `.ts`

**Intent**: ≥768px split (info | map) like browse; mobile stacks map below or hides when no geometry; keep text route list.

**Contract**: Reuse `BreakpointObserver` pattern from `job-offers-page.ts`. Load centroids once (geo API) then bind map.

#### 4. Tests

**Intent**: Unit-test centroid→leg helper / decorator wiring mocks as feasible; Nest geo controller returns all allowlisted codes.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx nx test baza-api` and `npx nx test baza-frontend` pass (geo + map helpers)

#### Manual Verification:

- Detail desktop: pin at company base + arrowed lines for legs; text routes still visible
- Missing centroid for a code: that leg omitted, others still draw
- Mobile: usable layout without broken map chrome
- `GET /api/geo/countries` returns PL/DE/… with finite lat/lng

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Apply form + publish-gate UX

### Overview

Wire apply form on detail (inline success) and ensure company publish UX clearly requires profile coordinates (backend gate already present).

### Changes Required:

#### 1. Apply form on detail

**Files**: `job-offer-detail-page.*` (+ small child component if clearer)

**Intent**: Multipart submit email, phone, optional message, required consent, PDF file; client MIME/size gates; show field errors; on success show inline confirmation and clear form.

**Contract**: `FormData` → `POST /api/offers/:id/applications`; client gates: email/phone required with max lengths (254/32), optional message ≤2000, consent required, PDF ≤5 MB; show mat-errors under fields; join ValidationPipe `message: string[]`; Polish copy; no CV URL in UI. Duplicates allowed (no unique error expected).

#### 2. Company publish FE clarity

**Files**: `company-offer-form-page.*`, possibly profile link/copy

**Intent**: Company base lat/lng are **required to publish**. On the offer form, load the company profile (or equivalent coords) and **disable** the publish control when coords are missing; show Polish guidance + link to profile to set them. When publish is attempted without coords (race/stale), still surface Nest `assertCanPublish` error via snackBar/field error.

**Contract**: Do not remove or bypass `assertCanPublish`. Draft/unpublished create without coords remains allowed. Publish toggle/button disabled until `baseLat`/`baseLng` (or profile equivalents) are non-null.

#### 3. Tests

**Intent**: FE specs for form validation (consent, PDF, size) and success path mocking HTTP; API publish-without-coords already covered — extend FE if useful.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test` passes (both apps)
- `npm run build` passes

#### Manual Verification:

- Full driver path: browse → detail → see map → apply with PDF → inline success; second apply same email succeeds
- Reject apply without consent / non-PDF with clear errors
- Company: publish control disabled without profile coords; guidance + profile link; after setting coords, publish works

**Implementation Note**: After Phase 3 manual OK, run `/10x-impl-review` then archive when merged.

---

## Testing Strategy

### Unit Tests:

- Nest: apply validation, unpublished offer, orphan cleanup, geo payload completeness, publish-without-coords (existing + regression)
- FE: query/form helpers, map leg building from centroids, extractError array join

### Integration Tests:

- Multipart apply against running API + configured R2 (manual/local) when credentials present

### Manual Testing Steps:

1. Published offer with base + multi-leg routes → map pin + arrows
2. Apply happy path; verify DB row + private key
3. Burst apply/register → 429
4. Publish offer without company coords → blocked with guidance

## Performance Considerations

- Load geo countries once per detail session (cache in component/signal)
- FitBounds only on visible layers; avoid re-init Leaflet on every change detection

## Migration Notes

- New `job_applications` table; Nest-only grants
- Existing published offers without coords: already cannot re-publish updates that stay published without coords; drafts OK. No mass unpublish required unless product later demands it
- Add `leaflet-polylinedecorator` to frontend dependencies

## References

- Related research: `context/changes/driver-apply-via-map/research.md`
- Browse map pattern: `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts`
- R2 logo pattern: `apps/baza-api/src/app/storage/r2-storage.service.ts`
- Publish gate: `apps/baza-api/src/app/company/job-offer.service.ts` (`assertCanPublish`)
- Lesson: `context/foundation/lessons.md` (FE+BE+DB validation)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Apply API + private CV storage

#### Automated

- [x] 1.1 Migration file present; `supabase db push` (or project equivalent) applies cleanly — 8997eaf
- [x] 1.2 `npm run lint` passes — 8997eaf
- [x] 1.3 `npx nx test baza-api` passes (apply + storage-related cases) — 8997eaf

#### Manual

- [x] 1.4 HTTP: multipart apply to published offer → 201; row in DB; CV object exists under private key (not fetchable via public R2 URL) — 8997eaf
- [x] 1.5 HTTP: missing consent / non-PDF / unpublished offer → Polish 400/404 — 8997eaf
- [x] 1.6 Confirm register + apply are rate-limited under burst — 8997eaf

### Phase 2: Geo centroids API + detail route map

#### Automated

- [x] 2.1 `npm run lint` passes — 3578918
- [x] 2.2 `npx nx test baza-api` and `npx nx test baza-frontend` pass (geo + map helpers) — 3578918

#### Manual

- [x] 2.3 Detail desktop: pin at company base + arrowed lines for legs; text routes still visible — 3578918
- [x] 2.4 Missing centroid for a code: that leg omitted, others still draw — 3578918
- [x] 2.5 Mobile: usable layout without broken map chrome — 3578918
- [x] 2.6 `GET /api/geo/countries` returns PL/DE/… with finite lat/lng — 3578918

### Phase 3: Apply form + publish-gate UX

#### Automated

- [x] 3.1 `npm run lint` passes — fa730fb
- [x] 3.2 `npm run test` passes (both apps) — fa730fb
- [x] 3.3 `npm run build` passes — fa730fb

#### Manual

- [x] 3.4 Full driver path: browse → detail → see map → apply with PDF → inline success; second apply same email succeeds — fa730fb
- [x] 3.5 Reject apply without consent / non-PDF with clear errors — fa730fb
- [x] 3.6 Company: publish control disabled without profile coords; guidance + profile link; after setting coords, publish works; Nest gate still enforced — fa730fb