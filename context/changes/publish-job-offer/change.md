---
change_id: publish-job-offer
title: Publish job offer
status: implementing
created: 2026-09-10
updated: 2026-09-10
archived_at: null
---

## Notes

Research: `research.md`. Plan: `plan.md` / `plan-brief.md`.

Decisions (2026-09-10):
- Manual lat/lng now; Google Places later for address → geocode.
- Single company branch: coords on `companies`; offers inherit pin at read.
- Map: Leaflet + OSM for S-02.
- Routes: ISO 3166-1 alpha-2 + full country name (curated EU + corridors).
- Plan Q: 1A one E2E delivery · 2A coords required to publish · 3A curated countries · 4A transport enum (incl. autowóz) · 5B create+edit+soft-unpublish · 6A mobile list-first / desktop list+map.
