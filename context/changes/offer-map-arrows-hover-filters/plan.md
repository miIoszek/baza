# Native map arrows, filter width, and route hover highlight Implementation Plan

## Overview

Replace leaflet-polylinedecorator with native Leaflet arrows that stay on the route at every zoom, make the job-offers filter bar fill the list width without overflowing, and highlight the hovered hop on the offer-detail map.

Research and plan-review skipped — FE-only polish; implementation already exists in `stash@{0}`.

## Current State Analysis

`OfferRouteMapComponent` (`apps/baza-frontend/src/app/pages/job-offers/offer-route-map.ts`) draws dashed polylines and uses `leaflet-polylinedecorator` `Symbol.arrowHead` (allowed in `project.json`, deps in root `package.json`). Arrows are plugin-owned and can drift from the line on zoom.

The filter bar (`.job-offers__filters` in `job-offers-page.scss`) is a wrapping flex row with a bottom border; fields flex at `10rem` and actions sit with `padding-top`, so the row can overflow the list width.

Offer-detail lists routes but does not bind hover to the map. `route-map-geometry.ts` builds `RouteMapLeg` labels as `FROM→TO` with no emphasis helper.

## Desired End State

- Route arrows are drawn as Leaflet polygons from pixel geometry (no `leaflet-polylinedecorator`).
- Job-offers filters span the list width; cards do not overflow horizontally.
- Pointer-enter on a route in offer-detail highlights that hop and dims the others; leave restores equal emphasis.

### Key Discoveries:

- Arrow heads today: `offer-route-map.ts` polylineDecorator + `leaflet-polylinedecorator` CommonJS allowlist.
- Filter layout: `job-offers-page.scss` `.job-offers__filters` / `__field` / `__filter-actions`.
- Geometry helpers live in `route-map-geometry.ts` (+ spec); new arrow math belongs next to them as `route-map-arrow.ts`.

## What We're NOT Doing

- Map library swap, clustering, or mobile map pane
- API / DTO / geo centroid changes
- Filter query behavior (only layout)
- Touch-only hover equivalent beyond pointer enter/leave

## Implementation Approach

One phase: land the stashed FE patch. Drop the decorator package, draw dashes/arrows in layer-pixel space, add hover emphasis on detail, and tighten the filter bar CSS.

## Phase 1: Native arrows, filter width, route hover

### Overview

Ship the three UI fixes together; they all live in the job-offers frontend.

### Changes Required:

#### 1. Native route arrows

**File**: `apps/baza-frontend/src/app/pages/job-offers/offer-route-map.ts`, `route-map-arrow.ts`, `route-map-arrow.spec.ts`, `apps/baza-frontend/project.json`, `package.json`, `package-lock.json`

**Intent**: Direction marks stay on the polyline at every zoom without the decorator plugin.

**Contract**: Remove `leaflet-polylinedecorator` and `@types/leaflet-polylinedecorator`. Draw dashed segments and filled arrow polygons from `latLngToLayerPoint` geometry. Re-render on zoom so pixels stay aligned.

#### 2. Filter bar width

**File**: `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.scss`

**Intent**: Filters and list cards share the same width; the sticky bar does not overflow.

**Contract**: Filters `width: 100%` / `box-sizing: border-box`; transparent field containers; actions `margin-left: auto`; cards `max-width: 100%` with wrap on location text.

#### 3. Hover highlight

**File**: `apps/baza-frontend/src/app/pages/job-offers/job-offer-detail-page.{html,ts,scss}`, `route-map-geometry.ts`, `offer-route-map.ts`

**Intent**: Scanning the route list shows which hop is which on the map.

**Contract**: `highlightedLabel` input on the map. `routeMapLegEmphasis` dims other hops when the hovered label is on the map. List rows use pointerenter/leave; unknown labels leave all hops undimmed.

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-frontend --testFile=route-map-arrow.spec.ts --testFile=route-map-geometry.spec.ts` passes
- `npx nx test baza-frontend` passes
- `npx nx lint baza-frontend` passes
- Root `package.json` has no `leaflet-polylinedecorator` / `@types/leaflet-polylinedecorator`

#### Manual Verification:

- On offer detail (desktop), zoom the map: arrows stay on the dashed lines
- On `/offers`, the filter row uses full list width and does not overflow
- Hover a route in the detail list: that hop is emphasized, others dim; leave restores

**Implementation Note**: After automated verification passes, pause for the human to confirm the three UI checks.

---

## Testing Strategy

### Unit Tests:

- Arrow/dash pixel helpers (`route-map-arrow.spec.ts`)
- `routeMapLegEmphasis` and multi-hop `buildRouteMapLegs` (`route-map-geometry.spec.ts`)

### Integration Tests:

- None. Existing frontend tests must stay green.

### Manual Testing Steps:

1. `npm run serve:frontend`, open an offer with several routes, zoom the map
2. Open `/offers` at desktop width and confirm filters + cards stay in the column
3. Hover / unhover routes on offer detail and watch the map

## Performance Considerations

Re-render route layers on zoom (pixel conversion). Keep hop count small (offer routes), no extra deps.

## Migration Notes

`npm install` after dropping the decorator packages. No API or data migration.

## References

- Need: `context/changes/offer-map-arrows-hover-filters/change.md`
- Map: `apps/baza-frontend/src/app/pages/job-offers/offer-route-map.ts`
- Filters: `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.scss`
- Geometry: `apps/baza-frontend/src/app/pages/job-offers/route-map-geometry.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Native arrows, filter width, route hover

#### Automated

- [x] 1.1 `npx nx test baza-frontend --testFile=route-map-arrow.spec.ts --testFile=route-map-geometry.spec.ts` passes — 836a74b
- [x] 1.2 `npx nx test baza-frontend` passes — 836a74b
- [x] 1.3 `npx nx lint baza-frontend` passes — 836a74b
- [x] 1.4 Root `package.json` has no `leaflet-polylinedecorator` / `@types/leaflet-polylinedecorator` — 836a74b

#### Manual

- [x] 1.5 On offer detail (desktop), zoom the map: arrows stay on the dashed lines — 836a74b
- [x] 1.6 On `/offers`, the filter row uses full list width and does not overflow — 836a74b
- [x] 1.7 Hover a route in the detail list: that hop is emphasized, others dim; leave restores — 836a74b
