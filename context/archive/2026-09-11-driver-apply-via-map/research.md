---
date: 2026-09-11T18:51:13Z
researcher: Auto
git_commit: 72ddc5f7878c5ccaa93c3640088a2e5d7cc0b6ba
branch: main
repository: miIoszek/baza
topic: "Jak w Bazie zaimplementować detail oferty z mapą trasy oraz aplikację bez konta (email, telefon, CV)"
tags: [research, codebase, job-offers, map, applications, r2, fr-008, fr-009, s-04]
status: complete
last_updated: 2026-09-11
last_updated_by: Auto
last_updated_note: "Added follow-up research for product decisions (map A+B, optional message, CV upload-only in S-04)"
---

# Research: Driver apply via map (S-04) — detail + mapa trasy + apply bez konta

**Date**: 2026-09-11T18:51:13Z  
**Researcher**: Auto  
**Git Commit**: `72ddc5f7878c5ccaa93c3640088a2e5d7cc0b6ba`  
**Branch**: main  
**Repository**: miIoszek/baza

## Research Question

Jak w Bazie zaimplementować detail oferty z mapą trasy oraz aplikację bez konta (email, telefon, CV) — co już jest (offer detail, mapa, upload R2, auth publiczny), czego brakuje, jakie wzorce i ryzyka?

Głębokość: pełna analiza. Focus: (1) offer detail + mapa tras FR-008, (2) formularz apply + storage CV/kontakt FR-009, (3) wzorce z archiwum publish/browse/R2.

## Summary

S-04 stoi na solidnym fundamencie browse/publish, ale **apply jest praktycznie niezaimplementowane**, a **mapa na detail nie spełnia FR-008**.

| Obszar | Stan |
|--------|------|
| Publiczny detail `/job-offers/:id` + `GET /api/offers/:id` | **EXISTS** (tekst: trasy, PJ, baza) |
| Leaflet + piny bazy na browse | **EXISTS** |
| Mapa na detail + linie/strzałki tras | **MISSING** (brak geo krajów) |
| Typy `JobApplication` / `CreateJobApplicationRequest` | **PARTIAL** (stub w shared-types) |
| Tabela + API applications + FE form | **MISSING** |
| R2 upload | **PARTIAL** — tylko **publiczne** logo (nie nadaje się 1:1 do CV) |
| Inbox firmy (S-05) | placeholder only |

**Kluczowe decyzje produktowe przed planem:** (A) linie tras vs pin bazy + lista krajów; (B) opcjonalne pole `message` na apply.

**Priorytet ryzyka:** prywatne CV (nie public URL) + orphan cleanup + walidacja FE+BE+DB (lesson) + rate limit na anonimowy multipart.

## Detailed Findings

### 1. Offer detail + mapa trasy (FR-008)

#### EXISTS

- Route Angular: `/job-offers/:id` → `JobOfferDetailPage` — [`app.routes.ts`](https://github.com/miIoszek/baza/blob/72ddc5f7878c5ccaa93c3640088a2e5d7cc0b6ba/apps/baza-frontend/src/app/app.routes.ts)
- Detail ładuje `GET ${api}/api/offers/:id` — `job-offer-detail-page.ts`
- UI: tytuł, transport, kadencja, trasy jako tekst `from → to`, doświadczenie, prawo jazdy, pensja, tekst bazy, opis — `job-offer-detail-page.html`
- Public Nest: `OffersPublicController` `@Get(':id')` → `getPublishedById` — join company coords → `baseLocation` + `routes` — `offers-public.controller.ts`, `job-offer.service.ts`
- Leaflet + OSM pin-only na browse: `OffersMapComponent` — input `markers: OfferMapMarker[]`, `L.circleMarker` — `offers-map.ts`; dep `leaflet@1.9.4`
- Responsive browse: `BreakpointObserver` ≥768px pokazuje mapę; mobile list-first — `job-offers-page.ts` / `.html` / `.scss`
- Model tras: `RouteDirection` = `{ from|to: { code, name } }` — `libs/shared/types/src/lib/route-direction.ts`; `COUNTRIES` bez lat/lng — `country.ts`
- Tech-stack: Leaflet/OSM OK; PostGIS / Places później — `context/foundation/tech-stack.md`

#### PARTIAL / MISSING

- Detail **nie** importuje mapy; layout single-column `max-width: 40rem` — brak split info|mapa jak w PRD
- `OffersMapComponent` **tylko piny** — brak `L.polyline` / strzałek
- Brak centroidów krajów / geokodu legów → **nie da się narysować PL→IT** bez nowego źródła geo
- Oferty bez `baseLocation` → pusta mapa nawet przy samym pinie bazy

#### Ryzyka FR-008

1. Roadmap unknown: **country-level lines vs pin + country list** — linie wymagają tabeli centroidów (lub zewnętrznego geocode); pin + lista krajów (już na detail) to tańszy MVP zgodny z „decide this”.
2. Stock Leaflet bez arrowheads — dekorator / custom SVG jeśli trzymamy lines.
3. Nie mieszać kontraktu browse-markers z detail-routes bez świadomego rozszerzenia komponentu.

### 2. Aplikacja bez konta + CV (FR-009)

#### EXISTS (prerequisites / patterns)

- Anonimowy POST istnieje: `POST /api/auth/register` (multipart) — wzorzec unguarded controller
- Publiczne odczyty ofert bez JWT — `OffersPublicController`
- Guard JWT opt-in (`JwtAuthGuard`) — łatwo dodać public `POST /api/offers/:id/applications`
- FE file picker: register/profile logo — `FormData`, MIME/size client-side — `register.ts`
- R2 service: S3 client, `put`, `deletePrefix`, `isConfigured` — `r2-storage.service.ts`
- Compensation orphanów przy register failure (Auth + R2 prefix) — `auth.service.ts`
- Nest-only DB (revoke anon/authenticated) dla `companies` / `job_offers` — migracje `*_nest_only.sql`

#### PARTIAL

- Shared types stub in `libs/shared/types/src/lib/application.ts`: `JobApplication` + `CreateJobApplicationRequest` (email, phone, optional message; CV via multipart note) — brak Nest DTO / mapperów.
- R2 dziś: **tylko** `uploadCompanyLogo` — sharp WebP, **public** `R2_PUBLIC_URL`, `CacheControl: public` — **nie kopiować dla CV**
- Brak presigned GET / GetObject proxy

#### MISSING

- Nest applications controller/service/DTO
- Migracja `applications` (+ CHECKs długości, FK do offer/company)
- FE apply form / CTA na detail
- Prywatny upload CV + download tylko dla właściciela firmy
- Rate limiting (brak Throttler / express-rate-limit w app)
- Company inbox = placeholder (`company-inbox-placeholder`) — **S-05**, poza minimalnym S-04 (persist wystarczy, jeśli inbox później czyta te same wiersze)

#### Ryzyka FR-009 / bezpieczeństwo

1. **Public CV URL** = naruszenie PRD/GDPR — trzymać **key**, serwować Nest JWT proxy lub short-lived presign
2. **Orphans** po failed insert — kompensacja `deletePrefix` jak logo
3. **Spam/DoS** anonimowego multipart — size limit + throttle
4. Lesson: walidacja **FE + BE + DB** dla email/phone/(message)/CV meta
5. `getConfig()` R2 wymaga dziś `R2_PUBLIC_URL` — prywatny upload musi działać bez publicznego bucket URL (lub osobna ścieżka config)

### 3. Auth publiczny vs chroniony (mapa granic)

| Endpoint | Auth |
|----------|------|
| `GET /api/offers`, `GET /api/offers/:id` | public |
| `GET /api/companies/:id` | public |
| `POST /api/auth/register` | public |
| `GET/PATCH /api/company/*`, inbox | JWT |
| Apply POST (do zbudowania) | **powinien być public** |
| CV download (do zbudowania) | **JWT + company ownership** |

CORS: `configure-app.ts` — `CORS_ORIGIN` lub `origin: true`, credentials.

## Code References

- `apps/baza-frontend/src/app/pages/job-offers/job-offer-detail-page.ts` — detail load, brak mapy/apply
- `apps/baza-frontend/src/app/pages/job-offers/offers-map.ts` — Leaflet pins only
- `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts` — 768px map pattern, switchMap/debounce po S-03 triage
- `apps/baza-api/src/app/company/offers-public.controller.ts` — public list + getById
- `apps/baza-api/src/app/company/job-offer.service.ts` — `getPublishedById`, `mapOffer`, `baseLocation`
- `apps/baza-api/src/app/storage/r2-storage.service.ts` — public logo upload
- `libs/shared/types/src/lib/application.ts` — apply stubs
- `libs/shared/types/src/lib/country.ts` — allowlist bez geo
- `supabase/migrations/` — `companies`, `job_offers` only

## Architecture Insights

1. **Nest-only data plane** — aplikacje powinny iść tą samą drogą (`service_role`), nie anon insert z PostgREST.
2. **Shared-types first** — rozszerzyć `CreateJobApplicationRequest` + response; Nest `class-validator` DTO + FE validators w lockstep (S-02/S-03).
3. **Split phases jak S-03** — (1) migration + POST apply + private CV storage, (2) detail map UX + apply form, (3) harden/validation polish — mapa nie powinna blokować persist aplikacji.
4. **R2 duality** — public bucket/path dla logo; private path/prefix dla CV (osobna metoda serwisu).
5. **Map reuse** — zostawić browse pin API; detail: albo rozszerzyć `OffersMap` o opcjonalne `legs`, albo osobny `OfferRouteMapComponent`.

## Historical Context (from prior changes)

### Reuse

- Fazy API→FE→harden: `context/archive/2026-09-11-driver-browse-job-offers/plan.md`
- Leaflet + OSM, pin = company base: `context/archive/2026-09-10-publish-job-offer/`
- R2 module + FormData + orphan compensation: `context/archive/2026-09-04-auth-company-logo-r2/`
- License wire `C_E` (nie `C+E` w URL), Nest filter API — S-03 locks
- Progress SHA + manual pause — obie slices

### Avoid

- FE-only validation — `context/foundation/lessons.md`
- Empty number → `0` (`@Type(() => Number)`) — S-03 F3
- Race bez `switchMap` — S-03 F1
- `message: string[]` bez joina — S-03 F2
- R2 orphans / loose MIME / multer 500 — R2 impl-review F1/F3/F4/F5
- Rubber-stamp manual R2 checks — R2 F7

### Decide (roadmap S-04)

1. Opcjonalne **message** na apply (FR-005 vs FR-009) — nie blokuje, wpływa na schema/UX.
2. **Linie tras vs pin + lista krajów** — nie blokuje, wpływa na złożoność Leaflet/geo.

S-03 jawnie odłożył route lines + apply do S-04 („What We’re NOT Doing”).

## Related Research

- `context/archive/2026-09-10-publish-job-offer/` — mapa pin + offers schema
- `context/archive/2026-09-11-driver-browse-job-offers/reviews/impl-review.md` — triage browse
- `context/archive/2026-09-04-auth-company-logo-r2/` — R2 patterns

## Open Questions

1. **Map MVP:** linie z centroidami `COUNTRIES` vs pin bazy + istniejąca lista tras (rekomendacja research: pin + lista na start, linie jako follow-up jeśli timeline ciasny)?
2. **Pole message:** opcjonalne w S-04 czy defer do S-05 inbox?
3. **CV download w S-04:** tylko zapis key + brak UI firmy (S-05), czy minimalny authenticated download endpoint już w S-04?
4. **Rate limit:** `@nestjs/throttler` na apply only vs global?
5. **MIME CV:** PDF only vs PDF+DOCX; max size (np. 5–10 MB)?
6. **Consent GDPR:** checkbox „zgoda na przetwarzanie” na formularzu apply?

## Follow-up Research 2026-09-11T18:55:00Z

Product decisions from owner (answers to Open Questions 1–3):

| # | Decision | Implication for `/10x-plan` |
|---|----------|----------------------------|
| 1 | **Map MVP = A + B** — pin bazy **oraz** linie tras z centroidami krajów | Extend `COUNTRIES` (or sibling table) with lat/lng centroids; detail map shows company `baseLocation` pin + polylines for each `routes[]` leg; keep text route list. Prefer extending/forking Leaflet map for legs without breaking browse pin-only API. |
| 2 | **`message` optional** on apply | Schema column nullable; FE optional field; align with FR-005 inbox later. |
| 3 | **S-04 = driver upload only** — no company CV download UI/endpoint yet | Persist `cvFileKey` privately in R2 + DB; do **not** expose public URL; authenticated download deferred to **S-05** inbox. Still require orphan cleanup and private keys so S-05 can attach download safely. |

Still open (not answered): rate-limit scope, CV MIME/size, GDPR consent checkbox — plan should propose defaults and confirm in plan-review if needed.
