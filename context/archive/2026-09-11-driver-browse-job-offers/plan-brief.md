# Driver Browse Job Offers — Plan Brief

> Full plan: `context/changes/driver-browse-job-offers/plan.md`

## What & Why

Drivers must open Job Offers without an account and filter by route countries/directions and home-return cadence (FR-006/007), with list + map staying useful on real published data. This slice also adds required driving-license category on offers and as a list filter, plus optional nearest-first sort when the driver shares location.

## Starting Point

S-02 already ships unauthenticated `GET /api/offers`, `/job-offers` list + Leaflet pins, and detail. Matching filters, `JobOfferFilters` wiring, license field, and geolocation sort are missing.

## Desired End State

A visitor filters offers via URL-synced controls (countries, cadence, license), optionally sorts by distance from their device, and sees one consistent result set in list and map—including a clear empty state with “Wyczyść filtry”. Companies set license (labels `B | C | CE | C+E`, wire `C_E` for the last) on create/edit.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Scope | Route + cadence + near + license | User expanded beyond FR-007 minimum | Plan |
| Country match | Any leg `from` **or** `to` in selected codes | Broader marketplace hits | Plan |
| Cadence match | Exact + `flexible` wildcard either side | Product-sensible flexibility | Plan |
| Filter location | Nest query on `GET /api/offers` | Scalable contract; Nest-only DB | Plan |
| Near | Opt-in geolocation, nearest-first, no radius | Meets NFR without geofence UX | Plan |
| License on create/update | Optional in Phase 1; required FE+BE in Phase 3 | Avoid breaking company form between phases | Plan review F2 |
| License values | Wire/DB `B\|C\|CE\|C_E`; UI label `C+E` for `C_E` | Avoid `+` query-string decoding bugs | Plan review F3 |
| Empty results | Hint + clear filters | Cold marketplace risk | Plan |
| URL | Sync all filter params (incl. near coords) | Shareable / refresh-safe | Plan |
| SQL vs in-memory | Filter/sort in Nest after published fetch | Volume still MVP-small | Plan |

## Scope

**In scope:** `license_category` migration; filterable public list API; Job Offers filter UI + URL + geolocation + empty state; company offer form license field; FE/BE/DB validation; tests.

**Out of scope:** Apply/CV, route lines, inbox, PostGIS/clustering/pagination, transport filter, radius cut-off, driver accounts, license multi-select.

## Architecture / Approach

Public reads stay on Nest service_role. FE sends query params; service applies matching rules and optional haversine sort. List and map share the same filtered array. Employer mutations remain under JWT `/api/company/offers*`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Model + API | License column + filtered `GET /api/offers` | JSON route matching edge cases |
| 2. Browse UI | Filters, URL, near, empty, map sync | Geolocation permission UX |
| 3. Company form | Required license on create/edit | Backfilled `C` may be wrong until edited |

**Prerequisites:** S-02 on `main`; Supabase linked for migration push.  
**Estimated effort:** ~2–3 sessions across 3 phases.

## Open Risks & Assumptions

- In-memory filter is fine until offer count grows; then push predicates into SQL/jsonb.
- Putting `nearLat`/`nearLng` in the URL can leak approximate location in shared links (accepted with 8B).
- Default backfill `'C'` is a temporary stand-in for pre-S-03 offers.

## Success Criteria (Summary)

- Unauthenticated driver can filter by country, cadence, and license with URL + list + map aligned.
- Optional location sorts nearest-first without excluding far offers.
- Companies cannot publish/edit without a valid license category; public API exposes it.
