# Native map arrows, filter width, and route hover highlight — Plan Brief

> Full plan: `context/changes/offer-map-arrows-hover-filters/plan.md`

## What & Why

Offer-map arrows should stay on the route at every zoom, the job-offers filter bar should fill the list width without overflowing, and hovering a route on offer detail should highlight that hop on the map.

## Starting Point

The map uses `leaflet-polylinedecorator`. Filters are a wrapping flex row that can overflow. Route list and map are not linked on hover.

## Desired End State

Native Leaflet arrows (no decorator package), full-width filters, hover emphasis on the matching hop.

## Key Decisions Made

| Decision | Source | Rationale |
| --- | --- | --- |
| Skip research / plan-review | this session | Trivial FE polish; code already in stash |
| One phase | this session | Three coupled UI fixes in job-offers |
| Pixel-space arrows | stash | Stay aligned on zoom without the plugin |

## Scope Boundaries

Out: new map stack, API/geo changes, filter query logic, mobile map pane.

## Open Risks

Stash may need a trivial rebase if `main` moved under the same files.

## Implementation Shape

Phase 1 lands the stashed patch, drops the decorator deps, and verifies with frontend tests + three UI checks.
