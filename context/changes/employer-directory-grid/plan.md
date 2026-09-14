# Employer Directory Grid Implementation Plan

## Overview

Add the simplest public employer directory: unauthenticated `GET /api/companies` returns **every** registered company **newest first**, each with a published-offer count; a `/companies` card grid (photo, name, address, offer count) opens the existing public profile on click. No filters, pagination, or map.

## Current State Analysis

Public **profile** is done; public **index** is not.

- Unguarded `GET /api/companies/:id` and `GET /api/companies/:id/offers` already exist on `CompanyPublicController`. There is no collection `@Get()`.
- `CompanyPublicProfile` has photo, name, and `baseLocation`, but **no** `offerCount`. Offers are `published = true` only.
- FE `/companies/:id` renders the profile. `/companies` falls through to home. Navbar public link is only “Oferty pracy”.
- `companies.created_at` exists (`timestamptz not null default now()`). No `companies(created_at)` index — acceptable at current small volume.
- Reads are Nest `service_role` only. The SPA must not query PostgREST.
- Offer browse already has glass cards, `pickCompanyLogoUrl` (`s48` first), initial-letter fallback, hide-empty location, and `baza-async-status`. There is no multi-column CSS grid yet.
- No `.rpc` / SQL views for aggregations. Job-offer public list already fetches then aggregates in Nest — reuse that simplicity, not a new SQL function.

User lock (this planning turn): **return all companies**, **newest first**, **MVP-only / as simple as possible**. Remaining research questions default to the cheapest option (no pagination, hide blank address, “Pracodawcy” nav, no profile back-link change, no roadmap row).

### Key Discoveries:

- Static `@Get()` on `CompanyPublicController` must sit **above** `@Get(':id')` / `:id/offers` so `/api/companies` is not parsed as a UUID (`ParseUUIDPipe` would 400). Same pattern as `OffersPublicController` list vs `:id`.
- Do **not** build the directory from `GET /api/offers` — that drops companies with zero published offers, which this MVP must include.
- `offerCount` is `count(job_offers where published = true)` only. Driver filters (country, cadence, near) do not apply.
- Equal `created_at` is possible; sort must add a stable `id DESC` tie-break so tests and UI order are deterministic. That tie-break is not a product rule — it is only for stability.
- Lesson `lessons.md` (form-field validation FE+BE+DB) does not apply: no new form fields or query DTO.

## Desired End State

A logged-out visitor opens **Pracodawcy** (`/companies`), sees a responsive card grid of every company (newest registration first), each card showing logo or initial, name, address when present, and `Oferty: N`. Click (or Enter/Space) opens `/companies/:id`. Companies with no published offers still appear with `Oferty: 0`. `GET /api/companies/:id` is unchanged.

Verify: `npm run lint`, `npx nx test baza-api`, `npx nx test baza-frontend`, `npm run build`; manual logged-out grid → profile click-through.

## What We're NOT Doing

- Filtering, search, sort UI, pagination, or query params on the list
- Hiding companies with `offerCount === 0`
- Changing `GET /api/companies/:id` / `CompanyPublicProfile` shape
- Slug URLs, anon/PostgREST SELECT, SQL views/RPCs, new indexes
- Map of companies, geocoding, Places
- Replacing `/` Job Offers as home
- Employer-workspace routes (`/company/*`, `/api/company/*`)
- Changing public-profile “← Oferty” back-link
- Polish declension of “oferta/oferty/ofert”
- New `@baza/ui` card component or moving logo helper into the UI lib
- Roadmap S-07 / PRD FR edits
- i18n, paid listings, driver accounts

## Implementation Approach

Two phases. Phase 1: shared list DTO + Nest collection on the existing public controller (two Supabase queries, in-memory count, sort in SQL). Phase 2: unguarded `/companies` page + navbar link, reusing offer-card chrome and `baza-async-status`.

## Critical Implementation Details

**Route registration:** declare `@Get()` list **before** `@Get(':id/offers')` and `@Get(':id')` on `CompanyPublicController`. Angular `path: 'companies'` (no param) can sit next to `companies/:id`; `/companies` today hits `**` → home.

**List query (no migration):** `companies` select `id, name, base_location, photo_urls, created_at` ordered `created_at DESC`, then `id DESC`. Second query: `job_offers` select `company_id` where `published = true`. Count in memory (missing key → 0). Do not return `created_at` on the wire. Rewrite `photo_urls` with existing `rewriteR2PhotoUrls`. Strip `user_id` / `photo_key` by never selecting them.

**Failure:** if either query errors, fail the list with a Polish `BadRequestException` (same family as `listPublished`). Empty table → `[]`, not an error.

## Phase 1: Shared list contract + `GET /api/companies`

### Overview

Add `CompanyDirectoryItem` and an unauthenticated collection endpoint that returns all companies newest-first with published `offerCount`.

### Changes Required:

#### 1. Shared list type

**File**: `libs/shared/types/src/lib/company.ts` (already exported via `index.ts`)

**Intent**: Canonical card payload, separate from the profile GET so detail stays stable.

**Contract**: New `CompanyDirectoryItem`: `id: string`, `name: string`, `baseLocation: string`, `photoUrls: Record<string, string> | null`, `offerCount: number`. Do not add `nip`, coords, description, or `createdAt`.

#### 2. Public list on existing Nest service/controller

**Files**: `apps/baza-api/src/app/company/company-public.service.ts`, `company-public.controller.ts`

**Intent**: Public index using the same unguarded Nest-only read path as `getById`.

**Contract**: `CompanyPublicService.list(): Promise<CompanyDirectoryItem[]>` as specified under Critical Implementation Details. `CompanyPublicController`: `@Get()` → `list()`, no JWT, no query DTO. Keep `:id` and `:id/offers` behavior identical.

#### 3. API tests

**Files**: `apps/baza-api/src/app/company/company-public.controller.spec.ts`; new or extended `company-public.service.spec.ts` (follow `job-offer.service.spec.ts` `getClient`/`from` mock)

**Intent**: Lock inclusion, sort, and published-only counts.

**Contract**: Cover: two companies ordered by `created_at` desc (tie → `id` desc); company with only unpublished offers has `offerCount: 0` and is still returned; published rows increment count; empty companies result is `[]`; photo URLs pass through rewrite helper; controller `list()` delegates to the service.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes after Phase 1 changes
- `npx nx test baza-api` passes (list includes all companies, newest first, published-only offerCount)
- New `CompanyDirectoryItem` is exported from `@baza/shared-types` (`npx nx build shared-types` or equivalent in `npm run build`)

#### Manual Verification:

- Logged-out `GET /api/companies` returns every company newest-first with `offerCount`; `GET /api/companies/:id` body is unchanged

**Implementation Note**: After automated checks pass, pause for manual confirmation before Phase 2.

---

## Phase 2: Public `/companies` grid + navbar

### Overview

Add an unguarded directory page and a public “Pracodawcy” nav link. Cards reuse offer-browse visuals; the whole card opens the existing profile.

### Changes Required:

#### 1. Directory page

**Files**: `apps/baza-frontend/src/app/pages/companies/company-directory-page.ts` (+ `.html`, `.scss`, `.spec.ts`)

**Intent**: Logged-out and logged-in visitors can browse all employers as cards.

**Contract**:
- `GET ${environment.apiBaseUrl}/api/companies` via `HttpClient` (same pattern as public profile / job offers)
- State chain with `baza-async-status`: loading (`Ładowanie pracodawców…`) → error + “Spróbuj ponownie” (`Nie udało się pobrać listy pracodawców`) → empty (`Brak pracodawców.`) → grid
- Grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr))`; glass card chrome aligned with `.job-offers__card`
- Card fields: logo via `pickCompanyLogoUrl` (import from `../job-offers/company-logo-url`) or initial placeholder; `name`; `baseLocation` only if non-empty after trim; `Oferty: {{ offerCount }}`
- Whole card is the hit target (`article` `role="link"` + click/Enter/Space → `Router.navigate(['/companies', id])`). No nested competing links
- Polish page title/subtitle, e.g. heading `Pracodawcy` and a one-line subtitle that this is a list of companies

#### 2. Route

**File**: `apps/baza-frontend/src/app/app.routes.ts`

**Intent**: `/companies` is the directory; `/companies/:id` stays the profile.

**Contract**: Unguarded `{ path: 'companies', loadComponent: …CompanyDirectoryPage }` (lazy, like Job Offers). Do not add `companyAuthGuard`. Keep `companies/:id` as-is.

#### 3. Navbar

**File**: `libs/baza/ui/src/lib/app-shell/app-shell.html`

**Intent**: Directory is reachable without typing the URL.

**Contract**: Public `mat-button` “Pracodawcy” → `/companies`, placed immediately after “Oferty pracy”, visible for guests and logged-in users. Use `routerLinkActive` **without** `exact: true` so a profile URL keeps the tab active. Do not add a `/company/*` link.

#### 4. FE tests

**File**: `apps/baza-frontend/src/app/pages/companies/company-directory-page.spec.ts` (HttpTestingController pattern from `company-public-profile.spec.ts`)

**Intent**: Guard the new page’s fetch and empty/error branches.

**Contract**: Success: GET `/api/companies`, names render, `Oferty: N` visible. Empty array → empty copy. HTTP error → retry copy. Optional: card click navigates to `/companies/:id` if cheap with `provideRouter`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes after Phase 2 changes
- `npx nx test baza-frontend` passes for the directory page specs
- `npm run test` and `npm run build` pass (CI mirror)

#### Manual Verification:

- Logged-out: navbar “Pracodawcy” → grid of all companies newest-first; cards show photo/initial, name, address (hidden if blank), `Oferty: N` including 0; click opens `/companies/:id`; retry works on API down; Job Offers `/` unchanged

**Implementation Note**: After automated checks pass, pause for manual confirmation.

## Testing Strategy

### Unit Tests:

- Nest list: inclusion of zero-offer companies; unpublished offers excluded from count; newest-first + id tie-break; `[]` when no rows; photo rewrite
- FE directory: HTTP success/empty/error (+ retry wiring)

### Integration Tests:

- None. Same as prior public-read slices (service_role mocked; manual smoke is enough)

### Manual Testing Steps:

1. Logged out, open `/companies` from “Pracodawcy”.
2. Confirm order is newest company first; a company with no published offers still appears with `Oferty: 0`.
3. Click a card → existing public profile; browser back returns to the grid.
4. Company without logo shows initial; company without address omits the address line.
5. `GET /api/companies/:id` still matches the old profile shape (no `offerCount` required there).

## Performance Considerations

Two unpaginated queries + in-memory count, matching `GET /api/offers`. Fine while company/offer counts stay MVP-small. No new index. Revisit SQL `LEFT JOIN` + `GROUP BY` only if this list becomes slow.

## Migration Notes

No schema change. Existing `companies` rows appear immediately, including those with empty `photo_urls` or zero published offers.

## References

- Related research: `context/changes/employer-directory-grid/research.md`
- Public controller (add list above `:id`): `apps/baza-api/src/app/company/company-public.controller.ts`
- Public service mapping/rewrite: `apps/baza-api/src/app/company/company-public.service.ts`
- Offer list-then-aggregate precedent: `apps/baza-api/src/app/company/job-offer.service.ts`
- Shared profile type (do not overload): `libs/shared/types/src/lib/company.ts`
- FE profile click-target: `apps/baza-frontend/src/app/pages/companies/company-public-profile.ts`
- Card chrome / logo helper: `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.scss`, `company-logo-url.ts`
- Nav insertion: `libs/baza/ui/src/lib/app-shell/app-shell.html`
- Async status: `libs/baza/ui/src/lib/async-status/async-status.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Shared list contract + `GET /api/companies`

#### Automated

- [x] 1.1 `npm run lint` passes after Phase 1 changes — 7e47afb
- [x] 1.2 `npx nx test baza-api` passes (list includes all companies, newest first, published-only offerCount) — 7e47afb
- [x] 1.3 New `CompanyDirectoryItem` is exported from `@baza/shared-types` (`npx nx build shared-types` or equivalent in `npm run build`) — 7e47afb

#### Manual

- [x] 1.4 Logged-out `GET /api/companies` returns every company newest-first with `offerCount`; `GET /api/companies/:id` body is unchanged

### Phase 2: Public `/companies` grid + navbar

#### Automated

- [x] 2.1 `npm run lint` passes after Phase 2 changes — 34b451c
- [x] 2.2 `npx nx test baza-frontend` passes for the directory page specs — 34b451c
- [x] 2.3 `npm run test` and `npm run build` pass (CI mirror) — 34b451c

#### Manual

- [x] 2.4 Logged-out: navbar “Pracodawcy” → grid of all companies newest-first; cards show photo/initial, name, address (hidden if blank), `Oferty: N` including 0; click opens `/companies/:id`; retry works on API down; Job Offers `/` unchanged
