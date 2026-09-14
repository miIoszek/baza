---
date: 2026-09-14T12:00:00+02:00
researcher: Cursor agent
git_commit: 93c7f2b
branch: main
repository: baza
topic: "Ground test-plan Phase 2 Risks #3/#4 — offer filters + FE↔API contract parity"
tags: [research, codebase, job-offers, filters, shared-types, testing]
status: complete
last_updated: 2026-09-14
last_updated_by: Cursor agent
---

# Research: Offer filter & contract parity (Risks #3 / #4)

## Research Question

Ground rollout Phase 2 of `context/foundation/test-plan.md` for Risks #3 and #4 — where filters live, what oracle proves protection, cheapest test layer (no e2e).

## Summary

- **Filtering is API-only** (`JobOfferService.matchesFilters` after loading published offers). FE only syncs URL ↔ `HttpParams`.
- Existing tests cover **boolean** predicate cases and DTO validation, **not** fixture → expected ID-set membership (Risk #3 gap).
- **Risk #4** is wire rename drift: HTTP `cadence`/`license`/`transport`/`nearLat`/`nearLng` vs product `homeReturnCadence`/`licenseCategory`/`requiredTransportType`/`near`. No shared-types contract specs yet.
- **Cheapest layer:** unit tests — table-driven `matchesFilters` membership oracle + wire→`parseListQuery`→`JobOfferFilters` mapping (plus FE HttpParams key checks already partially present).

## Detailed Findings

### Risk #3 — Silent wrong/empty filter results

| Piece | Location |
|-------|----------|
| Entry | `offers-public.controller.ts` GET `/offers` |
| Parse | `job-offer.service.ts` `parseListQuery` |
| Apply | `listPublished` → in-memory `.filter(matchesFilters)` |
| Semantics | Countries: any selected code on any leg from/to. Cadence: exact OR either side `flexible` |

**Oracle:** Fixed fixture offers + known filter inputs → exact expected ID set (never “non-empty”).

**Existing:** `job-offer.service.spec.ts` boolean matches; `list-offers-query.dto.spec.ts`; FE URL helpers in `job-offers-page.spec.ts`.

**Gap:** No membership table for combined country+cadence; no multi-offer filter set assertion.

### Risk #4 — FE↔API contract drift

Shared `JobOfferFilters` uses product names; Nest `ListOffersQueryDto` + FE `JobOffersQueryModel` use wire names. Mapping only in `parseListQuery`.

**Cheapest proof:** Wire fixture → `parseListQuery` equals expected `JobOfferFilters`; FE `jobOffersQueryToHttpParams` uses same wire keys. Avoid whole-DTO snapshots.

### What would prove protection

| Risk | Proof | Challenge |
|------|-------|-----------|
| #3 | Fixture set → filter → exact IDs | “Non-empty list ⇒ filters OK” |
| #4 | `cadence` maps to `homeReturnCadence`, etc. | “Typecheck green ⇒ contract holds” |

### Cheapest layer recommendation

Unit only for Phase 2 — no Playwright, no real DB. Optional later: HTTP GET integration.

## Code References

- `apps/baza-api/src/app/company/job-offer.service.ts` — parseListQuery, matchesFilters, listPublished
- `apps/baza-api/src/app/company/dto/list-offers-query.dto.ts`
- `libs/shared/types/src/lib/job-offer.ts` — JobOfferFilters
- `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts` — query helpers
- `apps/baza-api/src/app/company/job-offer.service.spec.ts` — existing filter units

## Open Questions (resolved for planning)

1. Fixture membership on `matchesFilters` (not full listPublished mock) — yes, cheapest + enough for #3.
2. Contract tests live next to API `parseListQuery` + FE params keys — yes.
3. Cookbook §6.5 filled when tests land.
