<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Job Offers list + detail UI/UX

- **Plan**: context/changes/job-offers-ui-ux/plan.md
- **Scope**: Phases 1–5 of 5 + post-plan polish (`c9b378b`…`fac0f14`)
- **Date**: 2026-09-13
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical  4 warnings  3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Findings

### F1 — Browse list dropped the planned 50/50 map

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: apps/baza-frontend/src/app/pages/job-offers/job-offers-page.html (HEAD); Progress 2.7
- **Detail**: Phase 2 required equal columns with base-pin map on the right at ≥768px. That landed in `b8076c5`, then `957d27d` removed `baza-offers-map` / `showMap` / `mapMarkers`. Desired End State and manual 2.7 still describe the map. User later asked to drop the list map; the plan was not amended.
- **Fix A ⭐ Recommended**: Document the list-only browse as a plan addendum and rewrite Progress 2.7 (map lives on offer detail only).
  - Strength: Matches the product the user signed off visually; keeps plan as source of truth for archive.
  - Tradeoff: Plan becomes a moving target after implementation.
  - Confidence: HIGH — user explicitly requested list without map.
  - Blind spot: Future readers of Desired End State will still see 50/50 unless that section is updated too.
- **Fix B**: Restore the browse map beside the list.
  - Strength: Restores plan Phase 2 contract and Progress 2.7.
  - Tradeoff: Undoes a UX call the user already accepted.
  - Confidence: LOW — contradicts later product direction.
  - Blind spot: `offers-map.ts` still exists and could be wired back.
- **Decision**: FIXED via Fix A — plan addendum + Desired End State / 2.3 / 2.7 retargeted to list-only browse

### F2 — Post-plan extras: transport filter, global forms, public profile, nav

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: list-offers-query.dto.ts:76; app.config.ts:15; company-public-profile.html; app-shell.html:31; country-basemap.ts
- **Detail**: After p5 the branch added a public `?transport=` filter, global `MAT_FORM_FIELD` fill + always-float, public-profile restyle, avatar→profile nav, shared page inset, and a GeoJSON country canvas. Plan said not to stack unrelated company-dashboard polish or do a full design-system rewrite. All of this was user-requested after the plan, not silent creep.
- **Fix A ⭐ Recommended**: Add a short addendum on the plan listing these extras (transport filter, shell/form tokens, profile restyle, country-scale map).
  - Strength: Preserves shipped UX; archive/review stay honest.
  - Tradeoff: Plan grows after approval.
  - Confidence: HIGH — extras are coherent with the same UX pass.
  - Blind spot: Transport filter has no Progress/manual row.
- **Fix B**: Revert extras that are outside Job Offers browse/detail.
  - Strength: Strict scope discipline.
  - Tradeoff: Loses forms, profile, and nav work the user already liked.
  - Confidence: LOW — user asked for this polish.
  - Blind spot: Hard to revert without also undoing shared tokens used by offers pages.
- **Decision**: FIXED via Fix A — addendum lists transport filter, form/shell tokens, public profile, nav avatar, country canvas

### F3 — Unescaped GeoJSON country names from a live `master` URL

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: apps/baza-frontend/src/app/pages/job-offers/country-basemap.ts:3, :40
- **Detail**: `bindTooltip(name)` passes Natural Earth `NAME` into Leaflet, which treats string tooltip content as HTML. Offer popups already use `escapeHtml`. The file is fetched from `raw.githubusercontent.com/.../master/...` (moving branch, not a commit SHA). Official names are benign today; a swapped file is an XSS vector on every detail map.
- **Fix**: Escape tooltip text (same helper as popups, or a text node) and pin the GeoJSON URL to a commit SHA — or vendor the file in the app.
- **Decision**: FIXED — tooltip uses a text node; GeoJSON URL pinned to Natural Earth commit `9380cca`

### F4 — Country layer can attach after map destroy; failed fetch is sticky

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: apps/baza-frontend/src/app/pages/job-offers/country-basemap.ts:30–62
- **Detail**: `loadCountries().then(...)` calls `L.geoJSON(...).addTo(map)` with no “map still alive” check. `ngOnDestroy` removes the map but not this pending layer. Fast leave of detail can addTo a dead map. The module-level `countriesGeojson` promise is assigned before success, so a 4xx/network failure is cached for the SPA lifetime.
- **Fix**: Skip `addTo` if the map container is gone; on fetch failure set `countriesGeojson = null` so the next map can retry.
- **Decision**: FIXED — skip `addTo` if map container is gone; reset cached promise on fetch failure

### F5 — Unused `OffersMapComponent` still carries the new basemap

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: apps/baza-frontend/src/app/pages/job-offers/offers-map.ts
- **Detail**: Browse no longer mounts the list map. The component remains, now calling `addCountryBasemap`. Dead code that would reintroduce F3/F4 if remounted.
- **Fix**: Delete `offers-map.ts` (+ scss) until a list map is planned again.
- **Decision**: FIXED — deleted `offers-map.ts` and `offers-map.scss`

### F6 — Manual Progress rows still unchecked

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/job-offers-ui-ux/plan.md ## Progress (1.3, 2.3–2.7, 3.3–3.5, 4.3–4.4, 5.5–5.8)
- **Detail**: Automated p1–p5 rows are `[x]` with SHAs. All Manual rows remain `[ ]`. User visually signed off (“jestem zadowolony”) but 2.7 still describes a browse map that HEAD no longer has. Automated this run: baza-api 81 tests passed, baza-frontend 47 passed, lint passed, `nx build baza-frontend` succeeded (style-budget warnings).
- **Fix**: After F1 decision, tick manuals that match HEAD (and rewrite 2.7 / 4.3 OSM wording).
- **Decision**: FIXED — manuals ticked; 4.3 wording is country canvas not OSM

### F7 — job-offers-page.scss over the 4 kB style budget

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: apps/baza-frontend/src/app/pages/job-offers/job-offers-page.scss (build warning: 4.10 kB vs 4.00 kB)
- **Detail**: Production build succeeded with a component style-budget miss of 104 bytes. Initial JS budget was already over before this change.
- **Fix**: Trim a few unused list-map/layout rules, or raise the component budget slightly.
- **Decision**: FIXED — dropped duplicated sticky-filter gradient (opaque `#020617` is enough)

## Triage summary

- **Fixed:** F1 (Fix A), F2 (Fix A), F3, F4, F5, F6, F7
- **Skipped:** none
- **Accepted:** none
