# Frame Brief: Job Offers list + detail UI/UX

> Framing step before /10x-plan. This document captures what is *actually*
> at issue, separated from what was initially assumed.

## Reported Observation

The Job Offers browse screen feels uneven and hard to scan (filters above a list|map split; cards show weak secondary actions and plain metadata; countries filter label looks wrong; company identity is missing from cards). Offer detail stacks description and apply awkwardly; route lines/arrows on the map are weak with no clear A/B endpoints. Site `/` is a health demo, not the marketplace.

## Initial Framing (preserved)

- **User's stated cause or approach**: Layout and card/map presentation are the main UX problems; home should be offers.
- **User's proposed direction**: Equal two columns (filters+list | map); whole-card click to detail; remove Szczegóły / Profil firmy buttons; show company name+logo on cards; metadata as pills/tags; fix countries filter label; detail two equal columns (description then apply form) with top “Aplikuj teraz” scroll-to-form; strong map lines and A/B markers (reference style); make offers the home route and move current home to something like `/doctor`.
- **Pre-dispatch narrowing**: Leading concerns are list readability/cards (A) and detail layout (B), plus map A/B clarity and default-route IA — confirmed via screenshots and a concrete punch list (not “I’m not sure”).

## Dimension Map

The observation could originate at any of these dimensions:

1. **List layout structure** — Filters sit above the list|map grid; equal “filters+list | map” needs structural HTML/CSS change, not only `1fr|1fr` tweaks.
2. **Card interaction / presentation** — Separate action buttons and plain text metadata; clickable card + pills are FE presentation. ← part of initial framing
3. **Offer payload / company branding** — Public `JobOffer` has no company name/logo; list join only pulls company geo/address. ← critical for logo+name request
4. **Detail information architecture** — Description and apply are stacked cards; no scroll-to-apply CTA.
5. **Route-map visualization** — Detail draws thin amber polylines + mid-line arrow; no distinct A/B endpoint markers; browse map is base pins only.
6. **IA / default route** — `path: ''` is `HomePage` (health smoke); product entry for drivers is `/job-offers`.

## Hypothesis Investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| Layout: filters above grid, not in left column | `job-offers-page.html` filters sibling above `.job-offers__layout`; grid already ~`1fr|1fr` | STRONG |
| Cards: buttons + plain meta (FE-only fix for click/pills) | Card actions Szczegóły / Profil firmy; meta in `<p>` | STRONG |
| Company name/logo missing from list DTO/API | `JobOffer` lacks name/photos; `listPublished` select `companies(base_lat, base_lng, base_location)` only; branding on `CompanyPublicProfile` | STRONG |
| Detail: stacked IA, no apply anchor | `job-offer-detail-page.html` main stack of cards; no scroll CTA | STRONG |
| Map: weak style + missing A/B markers (detail) | `offer-route-map.ts` weight-3 amber + mid arrow; endpoints not marked; legs = country centroids | STRONG |
| Home is health demo, not offers | `app.routes.ts` `''` → `HomePage`; AppShell brand → `/` | STRONG |

## Narrowing Signals

- User chose **1A**: company name **and** logo are must-have this slice → plan must include API/DTO enrichment of public offers (not FE-only N+1).
- User chose **2A**: relocate current home to **`/health`** (not `/doctor`; aligns with `GET /api/health` vocabulary).
- User chose **3A**: strong A/B map treatment is for **offer detail only** (browse map stays pin-oriented unless a later slice expands it).
- Countries filter label: multi-select empty `[]` vs single selects with `""` — Material float semantics; FE fix in the same list polish.

## Cross-System Convention

- List-fetch enrichment for display fields belongs in the public offers mapper (same pattern as embedding `companyBaseLocationText`), not ad-hoc FE fetches.
- Photo URLs should reuse the existing R2 rewrite path used by `CompanyPublicService`.
- Default marketplace entry at `/` with redirect from `/job-offers` matches “driver opens Job Offers without account” product wedge; keep `/job-offers/:id` and redirect list path for bookmarks.
- Map A/B: paint endpoint markers on existing centroid legs; thicker/dashed line styling — do not invent street-level routing in this slice.

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: Drivers cannot efficiently scan and enter the marketplace because browse layout/cards hide hierarchy and company identity (identity requires offer-list API enrichment), detail does not guide apply, route A→B is visually under-marked, and `/` does not land on offers.

The user’s UI directions are largely confirmed as the right *surfaces* to change. The important reframe vs “pure FE polish”: **company logo/name on cards is a vertical FE+API contract change**, and the old home should move to **`/health`**, not `/doctor`. Map work is **detail-route-map styling + A/B markers**, not browse-map routes.

## Confidence

- **HIGH** — code evidence for every dimension; narrowing answers locked API must-have, `/health`, and detail-only A/B.

## What Changes for /10x-plan

Plan a vertical slice covering: (1) enrich public `JobOffer` with company name + photo URLs and map them in Nest list/detail as needed; (2) restructure browse to filters+list | map, clickable cards, pills, filter label fix; (3) restructure detail to two columns + scroll-to-apply; (4) strengthen detail route map A/B; (5) make Job Offers the `/` route, move HomePage to `/health`, redirect `/job-offers` → `''`. Stay off S-05 inbox/CV. Prefer a **new branch** (not stacking on open S-06 PR) unless product insists on combining.

## References

- Source files: `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.html`, `job-offer-detail-page.html`, `offers-map.ts`, `offer-route-map.ts`, `apps/baza-frontend/src/app/app.routes.ts`, `libs/shared/types/src/lib/job-offer.ts`, `apps/baza-api/src/app/company/job-offer.service.ts`
- Related research: none yet for this change-id (S-06 `ux-improvements` is async-status only)
- Investigation: offer card company data; detail map A/B; home route blast radius; list layout/filter labels
