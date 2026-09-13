# Job Offers list + detail UI/UX Implementation Plan

## Overview

Redesign Job Offers browse and offer detail for scanability and apply conversion: enrich public offers with company name/logo, equal-column layouts, clickable cards with pills, stronger detail route A/B map using theme tokens, and make offers the site home (`/`) while moving the health demo to `/health`. Ships on branch `feat/ux-improvements` alongside S-06.

## Current State Analysis

- Browse: filters sit **above** list|map; cards use Mat actions (Szczegóły / Profil firmy); metadata is plain text; `JobOffer` has no company name/logo (`companyId` + base location only).
- Countries multi-select starts as `[]` so Material outline label often does not float (unlike cadence/license with `""`).
- Detail: stacked cards (info then apply); map uses thin amber polyline + mid arrow, no A/B endpoint markers (`offer-route-map.ts`).
- Routes: `''` → `HomePage` (API health smoke); marketplace at `/job-offers`.
- Theme already defines primary (sky), secondary (mint), tertiary (amber) in `styles/_theme.scss`.

## Desired End State

Drivers landing on `/` see a filters+list browse with company-branded, clickable cards and pill metadata (no list map). Offer detail is two equal columns (description with “Aplikuj teraz” scroll CTA above apply form | map). Route map shows country outlines plus clear A/B markers and a strong dashed line colored from theme CSS variables. Old home lives at `/health`; `/job-offers` redirects to `/`. Public offer JSON includes `companyName` + `companyPhotoUrls`.

### Key Discoveries:

- Company branding requires Nest select/join + `mapOffer` enrichment with `rewriteR2PhotoUrls` (`job-offer.service.ts`, `company-public.service.ts`) — not FE-only.
- Browse list has no map (dropped after Phase 2 shipped 50/50); A/B country-scale work is detail `offer-route-map` only.
- Leaflet pathOptions need resolved colors via `getComputedStyle` from CSS variables — document tokens in `_theme.scss`.

## What We're NOT Doing

- S-05 inbox, applications schema, CV download changes
- Street-level routing / real road geometries (keep country centroids)
- Browse list map (detail map only)
- Drawing A/B routes on the browse list map
- Full design-system rewrite beyond these surfaces
- Removing `/job-offers/:id` (detail URLs stay)
- Stacking unrelated company-dashboard polish

## Implementation Approach

Vertical phases: contract first (so FE can render branding), then browse UI, detail UI, map tokens/markers, then route IA. Implement on existing `feat/ux-improvements` (decision 1B). Preserve S-06 `baza-async-status` usage on browse states.

## Critical Implementation Details

**Offer select strings:** Introduce one shared `companies(...)` select fragment (include `base_lat, base_lng, base_location, name, photo_urls`) and use it for **every** query that feeds `mapOffer` — public and owner paths alike — so branding is consistent and no path is forgotten.

**Card click vs company link:** Lock this pattern: the card host is a single focusable control that navigates to detail (`routerLink` / keyboard activatable). Company logo+name are an inner `<a routerLink="/companies/:id">` with `$event.stopPropagation()` (and Enter/Space not double-firing the card). Do not wrap the whole card in `<a>` that also contains the company link.

**Map theme tokens:** Add to `baza-dark-theme` mixin with an explicit comment that theme edits must revisit map pins/line. Resolve at runtime in `offer-route-map.ts` from the map host element.

**Apply scroll:** Give the apply card a stable `id` (e.g. `offer-apply`); “Aplikuj teraz” uses `scrollIntoView({ behavior: 'smooth', block: 'start' })` (or fragment + scroll).

## Phase 1: Enrich public JobOffer with company branding

### Overview

Extend shared `JobOffer` and Nest mapping so list/detail responses include company name and rewritten photo URLs.

### Changes Required:

#### 1. Shared types

**File**: `libs/shared/types/src/lib/job-offer.ts`

**Intent**: Add display fields for list/detail cards.

**Contract**: Add `companyName: string` and `companyPhotoUrls: Record<string, string> | null` (or reuse a small photo-urls type if one exists). Keep existing fields unchanged.

#### 2. Nest OfferRow + selects + mapOffer

**File**: `apps/baza-api/src/app/company/job-offer.service.ts` (+ specs)

**Intent**: Join `name, photo_urls` from `companies`; map via `rewriteR2PhotoUrls`.

**Contract**: Update `OfferRow.companies` type; shared select fragment on **all** `mapOffer` call sites (create/update/unpublish/listForOwner/listPublished/listPublishedByCompany/getPublishedById); unit tests assert name + photo mapping on `listPublished` (and get-by-id if covered). Missing company name → empty string or safe fallback `''`; null photos OK.

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-api --testPathPatterns=job-offer.service` passes (or full `npx nx test baza-api`)
- `npx nx lint baza-api` passes (touched projects)

#### Manual Verification:

- `GET /api/offers` JSON includes `companyName` and `companyPhotoUrls` for a published offer with logo

**Implementation Note**: Pause for manual confirmation before Phase 2.

---

## Phase 2: Browse layout + cards + filter label

### Overview

Restructure Job Offers page to equal columns (filters+list | map); redesign cards; fix countries label.

### Changes Required:

#### 1. Page structure + styles

**Files**: `job-offers-page.html`, `job-offers-page.scss`, `job-offers-page.ts` as needed

**Intent**: Left column = filters + list (incl. async-status blocks); right = map at ≥768px; equal `1fr 1fr`.

**Contract**: Mobile: stack (filters, list, map below or hidden per existing breakpoint). Keep S-06 loading/error/empty via `baza-async-status`.

#### 2. Cards

**Files**: same page templates/styles; optional small helper for logo URL pick (`s48` → `s96` → `original`)

**Intent**: Remove Szczegóły / Profil firmy buttons; card host opens detail; company logo (`s48` preference) + name as inner profile link with stopPropagation; pills for license, cadence, transport, experience, salary when present.

**Contract**: Follow locked card pattern in Critical Implementation Details. Pills use theme-friendly styles (surface-container / outline); card keyboard-activatable.

#### 3. Countries filter label

**File**: `job-offers-page.html` (+ TS if needed)

**Intent**: Ensure outline label floats like other filters (e.g. float label always, or nonempty display value / `floatLabel`).

**Contract**: Empty multi-select still shows floated “Kraje trasy”.

#### 4. Tests

**File**: `job-offers-page.spec.ts` and/or helpers

**Intent**: Cover logo URL fallback helper if extracted; keep query helpers green.

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-frontend --include='**/job-offers-page.spec.ts'` passes
- `npx nx lint baza-frontend` passes

#### Manual Verification:

- Desktop: equal columns; filters in left column with list
- Card click → detail; company name/logo → company profile
- Pills visible for license/cadence/etc.
- Countries label floated when empty
- Map still shows base pins on the right

**Implementation Note**: Pause before Phase 3.

---

## Phase 3: Detail two-column layout + Aplikuj teraz

### Overview

Split offer detail into equal columns; add scroll CTA to apply form.

### Changes Required:

#### 1. Detail template + styles

**Files**: `job-offer-detail-page.html`, `job-offer-detail-page.scss`, `job-offer-detail-page.ts`

**Intent**: Left: offer description (+ “Aplikuj teraz” at top when apply form visible) then apply form below in the same column; right: map when geometry exists. Equal columns on desktop.

**Contract**: `id="offer-apply"` (or equivalent) on apply section; CTA scrolls smoothly into view; success state still replaces form. Mobile stacks sensibly. Show company name/logo on detail header if fields present (optional but preferred since API now has them).

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-frontend --include='**/job-offer-detail-page.spec.ts'` passes (update if selectors change)
- `npx nx lint baza-frontend` passes

#### Manual Verification:

- Desktop two equal columns; map on right
- “Aplikuj teraz” scrolls to form
- Apply still submits successfully

**Implementation Note**: Pause before Phase 4.

---

## Phase 4: Detail map A/B + theme tokens

### Overview

Add theme CSS variables for route map colors; draw distinct A/B markers and a strong dashed line.

### Changes Required:

#### 1. Theme tokens

**File**: `apps/baza-frontend/src/styles/_theme.scss`

**Intent**: Document map route colors as first-class theme tokens.

**Contract** (illustrative defaults aligned to current palette):

```scss
// Map route markers/line — update these when changing brand colors
--baza-map-route-from: var(--mat-sys-primary);      /* point A */
--baza-map-route-to: var(--mat-sys-secondary);        /* point B */
--baza-map-route-line: var(--mat-sys-tertiary);      /* path */
```

#### 2. Offer route map rendering

**File**: `offer-route-map.ts` (+ scss if needed)

**Intent**: For each leg, marker at `from` (A) and `to` (B) using token colors; polyline dashed, heavier weight, line color from token; keep or soften mid-arrow so A/B remain primary.

**Contract**: Resolve CSS variables from host via `getComputedStyle`; fallback hex if missing. No change to browse `offers-map` beyond invalidateSize if layout shift already handled.

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-frontend` passes (or targeted specs)
- `npx nx lint baza-frontend` passes

#### Manual Verification:

- Detail map: clear A vs B colors matching theme; dashed strong line readable on OSM tiles
- Changing tokens in theme (dev check) affects map after reload

**Implementation Note**: Pause before Phase 5.

---

## Phase 5: Make offers the home route

### Overview

Job Offers list becomes `/`; health HomePage moves to `/health`; redirect `/job-offers` → `''`.

### Changes Required:

#### 1. Routes + shell/nav

**Files**: `app.routes.ts`, `libs/baza/ui/.../app-shell.html`, any hardcoded `/job-offers` list links that should stay or redirect

**Intent**: `path: ''` → JobOffersPage (lazy OK); `path: 'health'` → HomePage; `path: 'job-offers'` → relative `redirectTo: ''` with `pathMatch: 'full'`; keep `job-offers/:id`.

**Contract**: Use relative `redirectTo: ''` (**not** absolute `'/'`) so `/job-offers?countries=…` keeps query params on `/`. Brand `/` lands on offers; nav “Oferty pracy” may point to `/` or `/job-offers` (both OK if redirect). Logout → `/` shows offers. Update `app.spec.ts` / home tests for new path.

#### 2. Back-links

**Files**: detail / public profile links to “all offers”

**Intent**: Prefer `routerLink="/"` or keep `/job-offers` (redirect). Detail URLs remain `/job-offers/:id`.

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-frontend` passes
- `npx nx test baza-api` passes
- `npm run lint` / project lints pass
- `npx nx build baza-frontend` (or `npm run build`) succeeds

#### Manual Verification:

- `/` shows offers list; `/health` shows old health page
- `/job-offers` redirects to `/`
- `/job-offers/:id` still works; apply + map OK
- AppShell brand and Oferty nav behave correctly

**Implementation Note**: After Phase 5, ready to push additional commits on `feat/ux-improvements` / update PR #11 or follow-up commits on same PR.

---

## Addenda (post-implementation)

### 2026-09-13 — List-only browse

After Phase 2 shipped equal columns with base pins, product direction dropped the marketplace map. `/` is filters + list only. The country-scale route map lives on offer detail (`offer-route-map` + Natural Earth canvas). Progress 2.3 and 2.7 retargeted to match HEAD.

### 2026-09-13 — Post-plan UX extras

User-requested after Phase 5, kept in this change:

- Public `?transport=` filter (`JobOfferFilters.requiredTransportType`)
- Shared page inset / content max-width; filled Material fields with always-float labels
- Public company profile restyle; AppShell avatar → `/company/profile`
- Dark Natural Earth country canvas on offer detail (no raster tiles)

---

## Testing Strategy

### Unit Tests:

- Nest: `listPublished` maps `companyName` / `companyPhotoUrls`
- FE: logo URL fallback helper; existing job-offers query helpers; detail specs updated for new DOM if needed
- Route/smoke: app spec adjusted for `/health`

### Integration Tests:

- None required beyond existing unit coverage for this slice

### Manual Testing Steps:

1. Browse desktop/mobile layouts
2. Card vs company click targets
3. Detail scroll CTA + apply
4. Map A/B visibility
5. `/`, `/health`, `/job-offers` redirect, detail deep link

## Performance Considerations

Enrichment is one join field expansion — no N+1. Prefer `s48` images on list cards.

## Migration Notes

No DB migration. Older clients ignoring new JSON fields remain compatible. Bookmark `/` changes meaning (health → offers) — `/health` preserves smoke page.

## References

- Frame: `context/changes/job-offers-ui-ux/frame.md`
- S-06 async-status: `libs/baza/ui/src/lib/async-status/`
- Theme: `apps/baza-frontend/src/styles/_theme.scss`
- Offer map: `offer-route-map.ts`
- Nest mapper: `job-offer.service.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Enrich public JobOffer with company branding

#### Automated

- [x] 1.1 `npx nx test baza-api --testPathPatterns=job-offer.service` passes (or full `npx nx test baza-api`) — 5fa37f7
- [x] 1.2 `npx nx lint baza-api` passes (touched projects) — 5fa37f7

#### Manual

- [x] 1.3 `GET /api/offers` JSON includes `companyName` and `companyPhotoUrls` for a published offer with logo

### Phase 2: Browse layout + cards + filter label


#### Automated

- [x] 2.1 `npx nx test baza-frontend --include='**/job-offers-page.spec.ts'` passes — b8076c5
- [x] 2.2 `npx nx lint baza-frontend` passes — b8076c5

#### Manual

- [x] 2.3 Desktop: filters + list fill the page (no map column)
- [x] 2.4 Card click → detail; company name/logo → company profile
- [x] 2.5 Pills visible for license/cadence/etc.
- [x] 2.6 Countries label floated when empty
- [x] 2.7 Map is on offer detail only (no browse pins)

### Phase 3: Detail two-column layout + Aplikuj teraz

#### Automated

- [x] 3.1 `npx nx test baza-frontend --include='**/job-offer-detail-page.spec.ts'` passes (update if selectors change) — c524467
- [x] 3.2 `npx nx lint baza-frontend` passes — c524467

#### Manual

- [x] 3.3 Desktop two equal columns; map on right
- [x] 3.4 “Aplikuj teraz” scrolls to form
- [x] 3.5 Apply still submits successfully

### Phase 4: Detail map A/B + theme tokens

#### Automated

- [x] 4.1 `npx nx test baza-frontend` passes (or targeted specs) — cb412b8
- [x] 4.2 `npx nx lint baza-frontend` passes — cb412b8

#### Manual

- [x] 4.3 Detail map: clear A vs B colors matching theme; dashed strong line readable on the country canvas
- [x] 4.4 Changing tokens in theme (dev check) affects map after reload

### Phase 5: Make offers the home route

#### Automated

- [x] 5.1 `npx nx test baza-frontend` passes — 840433a
- [x] 5.2 `npx nx test baza-api` passes — 840433a
- [x] 5.3 `npm run lint` / project lints pass — 840433a
- [x] 5.4 `npx nx build baza-frontend` (or `npm run build`) succeeds — 840433a

#### Manual

- [x] 5.5 `/` shows offers list; `/health` shows old health page
- [x] 5.6 `/job-offers` redirects to `/`
- [x] 5.7 `/job-offers/:id` still works; apply + map OK
- [x] 5.8 AppShell brand and Oferty nav behave correctly
