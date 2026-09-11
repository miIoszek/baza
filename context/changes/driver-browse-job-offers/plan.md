# Driver Browse Job Offers (S-03) Implementation Plan

## Overview

Enable unauthenticated drivers to filter public Job Offers by route countries (from or to), home-return cadence, and required driving-license category, optionally sort nearest-first when they share location, and keep list + map in sync via URL query params (FR-006, FR-007).

## Current State Analysis

- Public browse already ships from S-02: `GET /api/offers` / `GET /api/offers/:id` without JWT (`offers-public.controller.ts`), Angular `/job-offers` list + Leaflet map (≥768px) and `/job-offers/:id` with no `canActivate`.
- `listPublished()` returns all `published = true` rows ordered by `created_at`; no query filters.
- Offer model has `routes` (`RouteDirection[]`) and `homeReturnCadence`; shared stub `JobOfferFilters` exists but is unused (`libs/shared/types/src/lib/job-offer.ts`).
- No driving-license field on `job_offers` or company offer forms.
- S-02 deferred driver filters / matching / pagination to S-03; route-line visualization and apply remain S-04.

### Key Discoveries:

- Nest-only access to `job_offers` (service_role); filters must live in Nest, not client Supabase.
- Map already drops offers without `baseLocation`; nearest-first should push those to the end of the list consistently.
- Lessons: lock validation FE + BE + DB for new `license_category` field.

## Desired End State

A visitor opens `/job-offers`, sets country / cadence / license filters (synced to the URL), optionally clicks “Użyj mojej lokalizacji”, and sees the same filtered set in the list and on the map. Companies set a single required license category (UI labels `B | C | CE | C+E`; wire/DB codes `B | C | CE | C_E`) when creating/editing offers. Empty filter results show a clear empty state with “Wyczyść filtry”.

## What We're NOT Doing

- Driver accounts / saved preferences
- Driving-license multi-select or free-text categories beyond the fixed set (`B`, `C`, `CE`, `C_E` wire / `C+E` label)
- Radius / geofence cut-off (only nearest-first sort)
- Route lines / arrows on detail map (S-04)
- Apply / CV upload / inbox (S-04 / S-05)
- PostGIS / clustering / pagination (defer until volume hurts; in-memory filter after published fetch is acceptable for MVP)
- Transport-type filter (not in FR-007 for this slice)
- Hard delete of offers

## Implementation Approach

1. Add `license_category` to DB + shared types + `mapOffer` / public list responses (create/update body field optional until Phase 3).
2. Extend `GET /api/offers` with validated query DTO; apply country / cadence / license predicates and optional haversine sort in `JobOfferService`.
3. Wire Job Offers FE filter bar + URL sync + geolocation button + empty state; keep list and map on the same filtered array.
4. Phase 3: extend company offer form with required license select and flip create/update DTO to **required** FE+BE together (DB DEFAULT `'C'` covers rows inserted without the column).

Matching rules (contract):

- **Countries** (multi-select ISO codes): offer matches if **any** route leg has `from.code` **or** `to.code` in the selected set. Empty country filter = no country constraint.
- **Cadence**: exact enum match; additionally, if the filter value is `flexible` **or** the offer’s cadence is `flexible`, treat as match (wildcard). Empty cadence filter = no cadence constraint.
- **License**: exact match on offer `licenseCategory`. Empty = no license constraint.
- **Near**: when `nearLat` + `nearLng` present, sort ascending by distance from offer `baseLocation`; offers with null `baseLocation` sort last (stable relative order among themselves). No radius exclusion.

## Phase 1: Model + public filter API

### Overview

Persist license category; expose filterable `GET /api/offers`; keep detail endpoint unchanged aside from returning the new field.

### Changes Required:

#### 1. Shared types

**File**: `libs/shared/types/src/lib/driver-license.ts` (new), `job-offer.ts`, `index.ts`

**Intent**: Define `DriverLicenseCategory = 'B' | 'C' | 'CE' | 'C_E'` (wire/DB; UI label for `C_E` is `C+E`) and constant list with display labels; add `licenseCategory` on `JobOffer` (always present after map); on create/update request types make it **optional in Phase 1** (required only after Phase 3). Flesh out `JobOfferFilters` to match API query shape (`countries`, `homeReturnCadence`, `licenseCategory`, `near`).

**Contract**: Export types from `@baza/shared-types`. Remove stale unused field names that disagree with this plan (`routesToCountries` → `countries`).

#### 2. Migration

**File**: `supabase/migrations/<timestamp>_job_offers_license_category.sql`

**Intent**: Add `license_category varchar` NOT NULL with CHECK in (`B`,`C`,`CE`,`C_E`); backfill existing rows with default `'C'` so publish path stays valid. Do **not** store `C+E` (plus breaks query strings).

**Contract**: Column name `license_category`; Nest maps to `licenseCategory`. Push with Supabase CLI after merge to linked project.

#### 3. Nest DTOs + public list

**File**: `apps/baza-api/src/app/company/dto/job-offer.dto.ts`, new query DTO, `offers-public.controller.ts`, `job-offer.service.ts`, specs

**Intent**: Prefer optional `@IsOptional` + `@IsIn` for `licenseCategory` on create/update in Phase 1 (omit → DB DEFAULT `'C'`). Do **not** require the field on employer mutations until Phase 3. `OffersPublicController.list` accepts query params and delegates to `listPublished(filters)`. Implement matching + optional near sort in the service (fetch published + company coords, filter in process for MVP JSON routes).

**Contract**: Query params (all optional): `countries` (comma-separated ISO codes or repeated), `cadence`, `license`, `nearLat`, `nearLng` (both required together). Invalid pairs → 400 with Polish message. Response items include `licenseCategory` (from column / DEFAULT). First `@Query()` DTO in this app: use a dedicated query class with ValidationPipe (already global); coerce `nearLat`/`nearLng` via `@Type(() => Number)` (or equivalent); parse `countries` from a comma-separated string (or repeated keys) inside the DTO/service before matching.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx nx test baza-api` passes (filter matching cases: from-or-to, flexible wildcard, license exact, near sort nulls-last, invalid near pair)
- Migration SQL is present and applies cleanly against linked project (or documented `supabase db push`)

#### Manual Verification:

- `curl` / HTTP client: unfiltered `GET /api/offers` still returns published offers including `licenseCategory`
- Filtered calls return only matching offers; clearing params restores full published set

**Implementation Note**: Pause for manual confirmation before Phase 2.

---

## Phase 2: Job Offers browse UI (filters + near + URL)

### Overview

Drivers set filters on `/job-offers`; URL and map/list stay consistent; empty and geolocation states are explicit.

### Changes Required:

#### 1. Filter bar + URL sync

**File**: `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts` (+ html/scss/spec)

**Intent**: Multi-select countries (reuse `COUNTRIES`), cadence select (incl. empty “dowolna”), license select (labels `B|C|CE|C+E`, values `B|C|CE|C_E` + empty), “Wyczyść filtry”, “Użyj mojej lokalizacji”. Bind filter state to router `queryParams` (shareable). On param change, call `GET /api/offers` with mapped query string (`license=C_E`, never raw `C+E`).

**Contract**: Query keys align with API (`countries`, `cadence`, `license`, `nearLat`, `nearLng`). Deny/unavailable geolocation shows Polish inline message and leaves sort as API default. Empty result: message + clear-filters CTA (no auto-relax).

#### 2. Map / list sync

**File**: `offers-map.ts` / job-offers template

**Intent**: Feed map only the current filtered `offers()` array (same as list). Preserve ≥768px map breakpoint behavior from S-02.

**Contract**: No separate client-side re-filter after fetch; server result is source of truth.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npx nx test baza-frontend` passes (filter param mapping / empty-state / clear-filters unit coverage where practical)

#### Manual Verification:

- Set country + cadence + license; list and map update together; refresh keeps filters via URL
- Grant location → nearest-first; deny → message, unsorted-by-distance list still filtered
- Force zero matches → empty state + clear restores unfiltered browse

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Company offer form license field

### Overview

Employers must set license category on create/edit so public filters have data to match.

### Changes Required:

#### 1. Company offer form + list display

**File**: `company-offer-form-page.*`, optional list/detail snippets, public detail page

**Intent**: Required single-select for license on create/edit with FE validators + mat-error (lessons.md). **Same phase:** flip Nest create/update DTO from optional → required `@IsIn`. Show license on employer list rows and public detail for transparency.

**Contract**: Submit payload includes `licenseCategory`; BE rejects missing/invalid after this phase. Existing offers backfilled to `C` remain editable.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test` passes (both apps)
- `npm run build` passes

#### Manual Verification:

- Create/edit offer with each license value; published offer appears under matching public filter
- Attempt submit without license → FE error; raw API without field → 400

**Implementation Note**: After Phase 3 automated green, complete manual checks then consider `/10x-impl-review` / archive.

---

## Testing Strategy

### Unit Tests:

- Nest: country from-or-to matching; cadence flexible wildcard; license exact; near nulls-last; validation of near pair and enum values
- FE: query param ↔ filter model mapping; empty-state visibility when `offers.length === 0` after filtered load

### Integration Tests:

- Not required beyond Nx unit targets for this slice

### Manual Testing Steps:

1. Publish two offers with different routes / cadences / licenses
2. Filter combinations on `/job-offers` and confirm list+map+URL
3. Toggle geolocation allow/deny
4. Clear filters from empty state

## Performance Considerations

MVP filters in Nest after fetching all published offers (current volume assumption from S-02). Revisit SQL/jsonb indexes or pagination if lists grow large.

## Migration Notes

- `license_category` NOT NULL DEFAULT `'C'` for existing rows; companies should review and edit real required category.
- No RLS change; Nest service_role remains sole accessor.

## References

- Roadmap S-03: `context/foundation/roadmap.md`
- Prior slice: `context/archive/2026-09-10-publish-job-offer/`
- Lessons: `context/foundation/lessons.md` (FE+BE+DB validation)
- Stub: `libs/shared/types/src/lib/job-offer.ts` (`JobOfferFilters`)
- Public API: `apps/baza-api/src/app/company/offers-public.controller.ts`
- FE browse: `apps/baza-frontend/src/app/pages/job-offers/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Model + public filter API

#### Automated

- [x] 1.1 `npm run lint` passes — 8bb7fa8
- [x] 1.2 `npx nx test baza-api` passes (filter matching + validation cases) — 8bb7fa8
- [x] 1.3 Migration SQL present and applies cleanly (`supabase db push` / linked project) — 8bb7fa8

#### Manual

- [x] 1.4 HTTP: unfiltered `GET /api/offers` still returns published offers including `licenseCategory` — 8bb7fa8
- [x] 1.5 HTTP: filtered calls return only matching offers; clearing params restores full published set — 8bb7fa8

### Phase 2: Job Offers browse UI (filters + near + URL)

#### Automated

- [x] 2.1 `npm run lint` passes — c88b9c5
- [x] 2.2 `npx nx test baza-frontend` passes (filter/URL/empty coverage) — c88b9c5

#### Manual

- [x] 2.3 Browser: set country + cadence + license; list and map update together; refresh keeps filters via URL — c88b9c5
- [x] 2.4 Browser: grant location → nearest-first; deny → message, list still filtered without distance sort — c88b9c5
- [x] 2.5 Browser: force zero matches → empty state + clear restores unfiltered browse — c88b9c5

### Phase 3: Company offer form license field

#### Automated

- [x] 3.1 `npm run lint` passes
- [x] 3.2 `npm run test` passes (both apps)
- [x] 3.3 `npm run build` passes

#### Manual

- [x] 3.4 Create/edit offer with each license value; published offer appears under matching public filter
- [x] 3.5 Attempt submit without license → FE error; raw API without field → 400
