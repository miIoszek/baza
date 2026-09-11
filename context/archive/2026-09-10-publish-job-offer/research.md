---
date: 2026-09-10T21:15:48+0000
researcher: Auto
git_commit: 1c2087a732c023ec4b93c6fe09b67e680b0fc103
branch: main
repository: miIoszek/baza
topic: "Co już jest w Bazie (schema, API, FE, mapa) i czego brakuje, żeby zaplanować S-02: publikacja oferty + pin na Job Offers (FR-003/FR-004)?"
tags: [research, codebase, job-offer, companies, map-pin, supabase, nest, angular]
status: complete
last_updated: 2026-09-10
last_updated_by: Auto
last_updated_note: "Added follow-up research for product decisions (lat/lng, company-only location, map library)"
---

# Research: S-02 publish-job-offer — existing vs missing (FR-003/FR-004)

**Date**: 2026-09-10T21:15:48+0000  
**Researcher**: Auto  
**Git Commit**: `1c2087a732c023ec4b93c6fe09b67e680b0fc103`  
**Branch**: main  
**Repository**: miIoszek/baza

## Research Question

Co już jest w Bazie (schema, API, FE, mapa) i czego brakuje, żeby zaplanować S-02: publikacja oferty + pin na Job Offers (FR-003/FR-004)?

## Summary

S-01 dał **company profile** (tekstowe `base_location`, publiczny odczyt przez Nest, JWT edit). **Oferty są greenfield**: brak tabeli `offers`/`job_offers`, brak endpointów Nest, brak stron FE Job Offers / listy na profilu, brak biblioteki map i lat/lng w DB.

Shared types **wyprzedzają** implementację: `JobOffer`, `CreateJobOfferRequest`, `GeoPoint`, cadence, routes już są w `@baza/shared-types`. Pin MVP = lokalizacja bazowa firmy (nie geometria tras — to S-04).

Lekcja projektu: walidacja FE + BE + DB razem — przy ofercie od razu planować limity i CHECKi.

**Blokery planowania (do decyzji w `/10x-plan`):**
1. Geokoding vs ręczne lat/lng (roadmap unknown; nie blokuje startu planu).
2. Gdzie trzymać współrzędne (kolumny na `companies` vs denormalizacja na ofercie).
3. Biblioteka mapy (Leaflet vs inna) — nic nie jest zainstalowane.

## Detailed Findings

### Database / schema

**Exists**
- Trzy migracje: create `companies`, drop public SELECT, varchar/CHECK limits.
- `companies.base_location` = `varchar(200)` tekst — bez lat/lng / PostGIS.
- RLS: owner SELECT/INSERT/UPDATE; public SELECT usunięty (odczyty publiczne przez Nest + service role).

**Missing for S-02**
- Tabela ofert (`job_offers` / `offers`) + FK `company_id`, pola FR-003, `published_at`.
- Persystencja pinu: `base_lat`/`base_lng` (lub równoważne) na firmie i/lub ofercie.
- RLS ofert (wzorzec: Nest service role + opcjonalnie owner policies).
- Indeksy pod przyszłe filtry S-03 (route/cadence) — można minimalnie w S-02.

Refs: [create_companies.sql](https://github.com/miIoszek/baza/blob/1c2087a732c023ec4b93c6fe09b67e680b0fc103/supabase/migrations/20260904120000_create_companies.sql), [drop_public_select.sql](https://github.com/miIoszek/baza/blob/1c2087a732c023ec4b93c6fe09b67e680b0fc103/supabase/migrations/20260909120000_companies_drop_public_select.sql), [field_length_limits.sql](https://github.com/miIoszek/baza/blob/1c2087a732c023ec4b93c6fe09b67e680b0fc103/supabase/migrations/20260909121000_companies_field_length_limits.sql).

### Shared types (ahead of DB)

**Exists**
- `GeoPoint { lat, lng }` — [company.ts:1-4](https://github.com/miIoszek/baza/blob/1c2087a732c023ec4b93c6fe09b67e680b0fc103/libs/shared/types/src/lib/company.ts#L1-L4)
- `CompanyPublicProfile.baseLocation: string` — profil bez GeoPoint
- `JobOffer` z `baseLocation: GeoPoint`, komentarz „Map pin = company base” — [job-offer.ts:11-24](https://github.com/miIoszek/baza/blob/1c2087a732c023ec4b93c6fe09b67e680b0fc103/libs/shared/types/src/lib/job-offer.ts#L11-L24)
- `CreateJobOfferRequest` **bez** location — pin z firmy — [job-offer.ts:26-34](https://github.com/miIoszek/baza/blob/1c2087a732c023ec4b93c6fe09b67e680b0fc103/libs/shared/types/src/lib/job-offer.ts#L26-L34)
- `HomeReturnCadence`, `RouteDirection`, `JobOfferFilters` (S-03)

**Gap:** typy nie są podpięte do API/FE/DB.

### Nest API

**Exists (mirror pattern)**
- Guarded: `@Controller('company')` + `JwtAuthGuard` — PATCH profile, ownership via `user_id`.
- Public: `@Controller('companies')` — GET `:id`, bez JWT.
- DTO: `class-validator` string Min/Max/Matches; global ValidationPipe whitelist.
- Brak `IsArray` / `ValidateNested` / `IsInt` / `IsIn` w API dziś — create-offer będzie pierwszym użyciem.

**Missing**
- Endpointy create/list/get ofert.
- DTO `CreateJobOfferDto` + serwis + migracja.
- Publiczny profil nie zwraca nested offers (FR-004 „on profile”).

Refs: [company.controller.ts](https://github.com/miIoszek/baza/blob/1c2087a732c023ec4b93c6fe09b67e680b0fc103/apps/baza-api/src/app/company/company.controller.ts), [company-public.controller.ts](https://github.com/miIoszek/baza/blob/1c2087a732c023ec4b93c6fe09b67e680b0fc103/apps/baza-api/src/app/company/company-public.controller.ts), [company.module.ts](https://github.com/miIoszek/baza/blob/1c2087a732c023ec4b93c6fe09b67e680b0fc103/apps/baza-api/src/app/company/company.module.ts).

### Angular FE

**Exists**
- Routes: `/company/profile` (guard), `/companies/:id` (public), `/company/inbox` placeholder.
- Profile edit + public: tekstowe `baseLocation`, brak sekcji ofert.
- Nav: „Profil firmy” tylko.

**Missing (FR-003/004 UI)**
- Formularz publikacji oferty.
- Lista ofert na profilu (edit + public).
- Strona Job Offers (lista + mapa) — zero route/stub.
- Link w shellu do Job Offers / „Dodaj ofertę”.

Refs: [app.routes.ts](https://github.com/miIoszek/baza/blob/1c2087a732c023ec4b93c6fe09b67e680b0fc103/apps/baza-frontend/src/app/app.routes.ts).

### Map / geocoding

**Exists:** tylko typy `GeoPoint`; docs (tech-stack, roadmap) mówią lat/lng **lub** geocode; PostGIS później.

**Missing:** leaflet/mapbox/google w `package.json`; żaden geocode service; brak kolumn współrzędnych.

NFR: na dużych ekranach mapa; na małych lista zamiast mapy (Job Offers) — plan UI powinien to uwzględnić.

### Lesson prior

`context/foundation/lessons.md`: lock validation FE + BE + DB (max lengths, field errors). Apply to offer fields and any new lat/lng columns.

## Code References

- `libs/shared/types/src/lib/job-offer.ts:11-34` — target API contracts for S-02 create/read
- `libs/shared/types/src/lib/company.ts:1-14` — GeoPoint vs string baseLocation on profile
- `apps/baza-api/src/app/company/company.controller.ts` — JWT ownership template for POST offer
- `apps/baza-api/src/app/company/company-public.controller.ts` — public read template for GET offers
- `supabase/migrations/20260904120000_create_companies.sql` — only business table today
- `apps/baza-frontend/src/app/app.routes.ts` — no offers routes yet

## Architecture Insights

1. **Public vs guarded split** is the house pattern: mutate under `/api/company/*` + JWT; browse under plural public controller; Nest service role bypasses RLS.
2. **Pin source of truth** should be company base coords resolved at read time (or denormalized onto offer at publish) — `CreateJobOfferRequest` already omits location.
3. **S-02 vs later:** list + base pin only; route lines = S-04; filters = S-03; no pin clustering (PRD Non-Goal).
4. Prefer extending `CompanyModule` or thin `OfferModule` imported like company — avoid inventing a parallel auth path.

## Historical Context (from prior changes)

- `context/archive/2026-09-08-company-public-profile/plan.md` — What We're NOT Doing: job offers, map pin, geocoding → S-02; `base_location` text.
- `context/foundation/roadmap.md` — S-02 Change ID `publish-job-offer`; unknown geocode vs manual lat/lng; first `offers` persistence.
- `context/foundation/tech-stack.md` — pin = lat/lng or geocode; PostGIS can wait.
- `context/changes/gate-company-routes/plan.md` — JWT `/api/company/*` intended for future offers/inbox.
- `context/foundation/prd.md` — FR-003/004 + Socrates kept pin at company base.

## Related Research

- None prior under `publish-job-offer/`. Closest: archived S-01 plan/research notes above.

## Open Questions

1. ~~**Geocode vs manual lat/lng?**~~ → **Decided** (see Follow-up): manual lat/lng now; Google Places later.
2. ~~**Store coords on companies vs offers?**~~ → **Decided**: on `companies` (single branch); offers inherit at read.
3. ~~**Map library?**~~ → **Recommended / decided for plan**: Leaflet + OSM (see Follow-up).
5. ~~**Country codes for routes?**~~ → **Decided**: ISO 3166-1 alpha-2 + pełna nazwa.
4. **FR-004 surfaces in one slice:** create form + profile list + Job Offers list/map — phase split recommended in plan (API/DB → publish UI → public list/map).

## Suggested plan phases (non-binding)

1. Migration: `job_offers` + `companies.base_lat` / `base_lng` (manual) + RLS notes  
2. Nest: POST `/api/company/offers`, GET public `/api/offers` (+ offers on company public or nested); join company coords into `JobOffer.baseLocation`  
3. FE: publish form (guarded) + lists on profile; profile edit gains optional/required lat/lng fields (alongside text address)  
4. FE: Job Offers page list + Leaflet map pins (responsive list-first on small screens)  
5. Tests + CI mirror  

Next skill: `/10x-plan publish-job-offer`

## Follow-up Research 2026-09-10T23:19+02:00

Product decisions from owner:

1. **Location input (MVP):** Manual `lat` / `lng` fields now. Later: Google Places (user types address → we geocode). Do **not** integrate Places in S-02.
2. **Where coords live:** Company has a **single branch** for MVP. Store `base_lat` / `base_lng` on `companies` (alongside existing text `base_location`). Offers do **not** carry their own pin — public `JobOffer.baseLocation: GeoPoint` is resolved from the company at read time (matches `CreateJobOfferRequest` having no location field).
3. **Map library (recommendation → plan default):** **Leaflet + OpenStreetMap tiles**.
   - Free, no API key for basic tiles; enough for FR-004 pins.
   - Light vs Google Maps; avoids paying for Maps JS until Places arrives.
   - When Places lands later, keep Leaflet for display or swap pin layer — decision can wait; coords remain `GeoPoint` either way.
   - Angular: use `leaflet` directly in a small component (or `@bluehalo/ngx-leaflet` if Generator-friendly); avoid Mapbox billing for MVP.

Still open for plan: phase split (#4).

## Follow-up Research 2026-09-10T23:23+02:00

4. **Country codes for routes:** ISO 3166-1 — store/display **alpha-2 short code + full country name** (UI picker from a curated list; validate code on BE/DB). Extends `RouteDirection` beyond bare `CountryCode` string as needed in plan.
