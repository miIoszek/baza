# Publish Job Offer (S-02) Implementation Plan

## Overview

Deliver roadmap slice **S-02** / **FR-003** + **FR-004**: a logged-in company can **create, edit, and soft-unpublish** free job offers; anyone can see published offers on the **company public profile** and on **Job Offers** (list + Leaflet map pin at the company base). Builds on S-01 company profile and the Nest public/guarded API split.

**Prerequisite:** S-01 (`company-public-profile`) merged.

## Current State Analysis

- **DB:** `companies` only (`base_location` text). No lat/lng, no offers table. Public SELECT dropped — Nest service role reads public data.
- **API:** Guarded `CompanyController` + public `CompanyPublicController`. No offer endpoints. Validation today is string Min/Max/Matches; nested arrays/enums not used yet.
- **FE:** `/company/profile`, `/companies/:id`, inbox placeholder. No Job Offers route, no map library, no offer forms.
- **Types:** `@baza/shared-types` already has `JobOffer`, `CreateJobOfferRequest`, `GeoPoint`, `HomeReturnCadence`, stub `RouteDirection` / `CountryCode` — need extending for code+name and transport enum.
- **Decisions (research + plan Q&A):** manual lat/lng on company; offers inherit pin at read; Leaflet+OSM; ISO alpha-2 + full name (curated list); coords required to publish; transport enum (incl. `car_transporter`); create+edit+soft-unpublish; mobile list-first / desktop list+map; single E2E phase.

### Key Discoveries

- Ownership pattern: resolve company by `req.user.id` → `companies.user_id`; never trust client `companyId` for authz (`company.service.ts`).
- `CreateJobOfferRequest` has no location field — pin comes from company (`job-offer.ts`).
- Lesson: lock validation FE + BE + DB (`context/foundation/lessons.md`).
- NFR: on small screens show list instead of map; large screens list + map.

## Desired End State

1. Company profile stores optional text `base_location` plus **`base_lat` / `base_lng`** (manual). Edit UI can set coords; publish requires both set.
2. Table **`job_offers`** stores FR-003 fields; `published` boolean (soft-unpublish); routes as JSON `{ code, name }[]` pairs; transport type from shared enum.
3. **JWT:** `POST/PATCH` company offers; soft-unpublish. **Public:** list all published offers, list by company, get one — each response includes `baseLocation: GeoPoint` from company join (omit offers whose company lacks coords from map; list may still show text location).
4. **FE:** publish + edit forms; lists on employer profile + public profile; `/job-offers` page (lista-first mobile, lista+mapa desktop); nav links.
5. `npm run lint`, `npm run test`, `npm run build` green; manual smoke for publish → profile → Job Offers pin.

## What We're NOT Doing

- Google Places / geocoding (later)
- Multiple company branches / offer-level pins
- Driver filters (S-03), route lines on map (S-04), apply/CV (S-04), inbox (S-05)
- Pin clustering
- PostGIS
- Payments / paid listings
- Hard delete of offers (soft-unpublish only)
- Full ISO 250-country picker (curated list only)

## Implementation Approach

One **E2E phase** (ordered workstreams): schema → shared contracts → Nest API → company lat/lng UI → offer create/edit UI → profile lists → Job Offers list+Leaflet → tests. Follow S-01 patterns: guarded `/api/company/*`, public plural controller, FE+BE+DB validation, Polish copy.

## Critical Implementation Details

**Publish gate:** `POST`/`PATCH` that would leave an offer `published=true` must fail with a clear Polish 400 if the owning company has null `base_lat` or `base_lng`. Soft-unpublish does not require coords.

**Pin resolution:** Never store lat/lng on `job_offers`. When mapping to `JobOffer`, join `companies` and set `baseLocation: { lat, lng }`. Offers whose company lacks coords must not appear as map markers; decide list inclusion in implement (prefer: still list with text `base_location`, no pin).

**Routes JSON:** Each leg stores `{ from: { code, name }, to: { code, name } }` (or equivalent) so display survives catalog tweaks; validate `code` against the curated allow-list on BE.

## Phase 1: Publish job offer (E2E)

### Overview

Ship schema, API, employer publish/edit/unpublish, profile offer lists, and public Job Offers list + Leaflet pins in one implementable slice.

### Changes Required

#### 1. Database migration

**File:** `supabase/migrations/<timestamp>_job_offers_and_company_coords.sql` (new)

**Intent:** Persist company map coords and job offers with soft-publish flag.

**Contract:**
- `companies`: add nullable `base_lat double precision`, `base_lng double precision` with CHECKs in range (−90…90 / −180…180) when not null; both null or both set.
- `job_offers`: `id uuid PK`, `company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE`, `title`, `description`, `home_return_cadence`, `required_years_experience int`, `required_transport_type text`, `routes jsonb NOT NULL`, `salary_min`/`salary_max`/`salary_currency` nullable, `published boolean NOT NULL DEFAULT true`, `created_at`/`updated_at`.
- Reasonable varchar/CHECK lengths aligned with DTO max lengths (title, description, transport type, currency).
- Indexes: `company_id`, `(published)` or partial index `WHERE published`.
- RLS: owner policies via company→user_id for write paths if desired; public reads remain Nest/service-role (same as companies). Do not re-open anon full-table SELECT.

#### 2. Shared types + catalogs

**Files:** `libs/shared/types/src/lib/job-offer.ts`, `route-direction.ts`, new `country.ts` / `transport-type.ts` (or equivalent), `index.ts` exports

**Intent:** Lock API/FE contracts and picker catalogs.

**Contract:**
- Extend `RouteDirection` to carry ISO alpha-2 **code + full name** for from/to.
- Export curated `COUNTRIES` (EU + corridors: at least UA, BY, RU, TR, GB, CH, NO, RS, BA, MK, … — ~30–40 entries) `{ code, namePl }`.
- Export `TRANSPORT_TYPES` / `TransportType` union including: `curtain`, `reefer`, `tanker`, `tipper`, `container`, `flatbed`, `low_loader`, `car_transporter`, `silo`, `hds`, `bus`, `van`, `other` with Polish labels.
- Align `JobOffer` / create / update request types with edit + `published` (or separate unpublish). Keep `baseLocation: GeoPoint` on read model only.
- Extend `CompanyPublicProfile` / `AuthMeCompany` with optional `baseLat`/`baseLng` (or nested `baseGeo`) for FE forms and pin readiness.

#### 3. Nest — company coords on profile

**Files:** `update-company-profile.dto.ts`, `register-company.dto.ts` (optional lat/lng), `company.service.ts`, `auth.service.ts` register insert, public company mapper, FE register/profile validators

**Intent:** Companies can store manual lat/lng; public/me responses expose them when set.

**Contract:** Optional `@IsNumber` lat/lng on update (and register if low-friction); both-or-neither validation; map to `base_lat`/`base_lng`. Polish field errors.

#### 4. Nest — offers API

**Files:** new DTOs + service + controllers under `apps/baza-api/src/app/company/` (or thin `offer/` module imported by `CompanyModule` / `AppModule`)

**Intent:** Company-owned mutations; public reads for Job Offers and profile.

**Contract:**
- Guarded: `POST /api/company/offers`, `PATCH /api/company/offers/:id`, `PATCH /api/company/offers/:id/unpublish` (or `published: false` on PATCH). Ownership via user→company; 404 if not owner.
- Public: `GET /api/offers` (published only), `GET /api/offers/:id`, `GET /api/companies/:id/offers` (published only) — or embed offers on public company GET (prefer separate list endpoint to keep profile payload small; public profile page may call both).
- Validate: title/description lengths, cadence `@IsIn(HOME_RETURN_CADENCES)`, transport `@IsIn(TRANSPORT_TYPES)`, routes array nested country codes in allow-list, optional salary min≤max, years `@IsInt @Min(0)`.
- Publish gate: reject published create/update without company coords.
- Map rows → `JobOffer` with joined GeoPoint.

#### 5. FE — profile lat/lng + offer forms

**Files:** `company-profile-page.*`, new `company/offers/*` pages (create/edit), `app.routes.ts`, `app-shell` nav

**Intent:** Employer can set coords and manage offers.

**Contract:**
- Profile form: lat/lng number inputs (Polish labels/help: “na razie ręcznie; Places później”).
- Routes under `companyAuthGuard`: e.g. `/company/offers/new`, `/company/offers/:id/edit`.
- Reactive forms with same validators as DTOs; Polish errors under fields.
- Actions: save (published), unpublish; after save link to public profile / Job Offers.
- Nav: “Oferty” / “Dodaj ofertę” when logged in.

#### 6. FE — profile offer lists + Job Offers page

**Files:** `company-public-profile.*`, employer profile offers section, new `pages/job-offers/*`, Leaflet dependency

**Intent:** FR-004 surfaces.

**Contract:**
- Public + employer profile: list published offers (title, cadence, routes summary, link).
- Public route `/job-offers` (no guard): list of published offers; **&lt; ~768px** list only; **≥ ~768px** list + Leaflet map with OSM tiles and one marker per offer that has company GeoPoint (click → offer detail or profile).
- Add `leaflet` (+ types) to frontend; small reusable map component; no Mapbox/Google keys.
- Shell/home link to Job Offers for everyone.

#### 7. Tests

**Files:** API DTO/service/controller specs; FE form/validator specs; optional public offers HTTP mock

**Intent:** Guard create/publish-without-coords, validation, ownership, public list filters unpublished.

**Contract:** Mirror S-01 style unit tests; full `npm run lint|test|build`.

### Success Criteria

#### Automated Verification

- Migration applies on linked Supabase (`supabase db push`) without error
- `npm run lint` passes
- `npm run test` passes (api + frontend)
- `npm run build` passes

#### Manual Verification

- Set company lat/lng on profile; publish offer with routes (ISO code+name), cadence, transport (incl. autowóz), optional salary
- Publish blocked with clear Polish error when coords missing
- Edit offer fields; soft-unpublish hides from public Job Offers and public profile list; owner still sees it as unpublished in employer UI
- Logged-out `/job-offers`: list; desktop shows map pins at company base; mobile shows list without forcing map
- Public `/companies/:id` shows published offers only

**Implementation Note:** Single E2E phase — after automated green, pause for the manual checklist before calling the slice done / opening PR.

---

## Testing Strategy

### Unit Tests

- DTO validation: bad NIP-style patterns N/A; bad country code; transport not in enum; salary min&gt;max; publish without coords (service)
- Ownership: cannot PATCH another company’s offer
- Public GET excludes `published=false`
- FE: form invalid states for routes/coords/transport

### Integration Tests

- None required beyond unit + manual E2E for MVP

### Manual Testing Steps

1. Register/login company; set lat/lng; create offer.
2. Open `/job-offers` logged out — see card + pin (desktop).
3. Unpublish — disappears from public surfaces.
4. Edit title/routes — public list updates.
5. Clear coords and try publish — rejected.

## Performance Considerations

Single-row writes; public list is unpaginated MVP — acceptable until volume grows (S-03 may add filters/pagination). Leaflet loads only on Job Offers desktop layout.

## Migration Notes

- Existing companies: `base_lat`/`base_lng` null until edited — cannot publish until set.
- No backfill geocoding.
- Apply migration with `supabase db push` (CLI already linked).

## References

- Research: `context/changes/publish-job-offer/research.md`
- PRD FR-003, FR-004: `context/foundation/prd.md`
- Roadmap S-02: `context/foundation/roadmap.md`
- Patterns: `apps/baza-api/src/app/company/company.controller.ts`, `company-public.controller.ts`
- Types: `libs/shared/types/src/lib/job-offer.ts`
- Lessons: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Publish job offer (E2E)

#### Automated

- [x] 1.1 Migration applies on linked Supabase (`supabase db push`) without error
- [x] 1.2 `npm run lint` passes
- [x] 1.3 `npm run test` passes (api + frontend)
- [x] 1.4 `npm run build` passes

#### Manual

- [x] 1.5 Set company lat/lng; publish offer with routes, cadence, transport, optional salary
- [x] 1.6 Publish blocked with clear Polish error when coords missing
- [x] 1.7 Edit + soft-unpublish hide from public surfaces; owner sees unpublished state
- [x] 1.8 Logged-out `/job-offers` list; desktop map pins; mobile list-first
- [x] 1.9 Public `/companies/:id` shows published offers only
