# Publish Job Offer — Plan Brief

> Full plan: `context/changes/publish-job-offer/plan.md`  
> Research: `context/changes/publish-job-offer/research.md`

## What & Why

Companies need to publish free job offers (routes, home-return cadence, experience, transport type, optional salary) and see them on the company profile and on Job Offers as a list plus a map pin at the company base (FR-003/FR-004). This is the supply side of the marketplace before drivers can browse (S-03).

## Starting Point

S-01 delivered company register/profile with text `base_location` only. Shared types already sketch `JobOffer` / `GeoPoint`. No offers table, no offer API/FE, no map library.

## Desired End State

A company sets manual lat/lng, creates/edits offers, can soft-unpublish; the public sees published offers on the company profile and on `/job-offers` (mobile list-first; desktop list + Leaflet pins).

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Map coords input | Manual lat/lng now; Places later | Avoid Google cost/complexity in MVP | Research |
| Where coords live | On `companies`; offers inherit at read | Single branch MVP | Research |
| Map stack | Leaflet + OSM | Free tiles, enough for pins | Research |
| Countries | ISO alpha-2 + full name, curated EU+corridors | Matching-ready without 250-item noise | Research / Plan |
| Coords vs publish | Required to publish | FR-004 pin always meaningful | Plan |
| Transport type | Fixed enum incl. autowóz | Stable filters later; industry labels | Plan |
| Lifecycle | Create + edit + soft-unpublish | Real employer workflow without hard delete | Plan |
| Job Offers layout | Mobile list-first; desktop list+map | Matches PRD NFR | Plan |
| Delivery shape | Single E2E phase | Owner preference; one slice | Plan |

## Scope

**In scope:** migration (`job_offers` + company lat/lng), Nest create/edit/unpublish + public lists, profile coords UI, offer forms, profile offer lists, `/job-offers` + Leaflet, tests/CI.

**Out of scope:** Places/geocoding, multi-branch pins, driver filters, route lines, apply/CV, inbox, clustering, PostGIS, payments, hard delete.

## Architecture / Approach

Guard mutations under `/api/company/offers*` (JWT, ownership via `user_id`). Public reads under `/api/offers` and company-scoped list (Nest service role). FE mirrors S-01 auth guards; map only on Job Offers desktop breakpoint. Validation locked FE + BE + DB.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Publish job offer (E2E) | Schema → API → FE publish/edit/lists → Job Offers map → tests | Large single phase; publish-without-coords and map edge cases |

**Prerequisites:** S-01 done; Supabase CLI linked for `db push`.  
**Estimated effort:** ~1–2 focused sessions (wide E2E surface).

## Open Risks & Assumptions

- Curated country/transport lists may need tweaks after real users (easy constant updates).
- Unpaginated public offer list is fine until volume grows.
- Leaflet + OSM attribution must remain visible.

## Success Criteria (Summary)

- Company can publish/edit/unpublish offers with validated routes and transport enum.
- Public Job Offers shows list + pins when coords exist; mobile stays list-first.
- Missing coords block publish with a clear Polish error.
