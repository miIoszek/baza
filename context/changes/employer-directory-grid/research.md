---
date: 2026-09-14T18:37:56+00:00
researcher: Auto
git_commit: 4e98dc5592c58be169d6b1f93bd473267ee05c80
branch: cursor/employer-directory-grid-b39b
repository: baza
topic: "Employer directory grid with profile cards"
tags: [research, codebase, companies, directory, job-offers, public-profile, angular, nestjs]
status: complete
last_updated: 2026-09-14
last_updated_by: Auto
---

# Research: Employer directory grid with profile cards

**Date**: 2026-09-14T18:37:56+00:00
**Researcher**: Auto
**Git Commit**: 4e98dc5592c58be169d6b1f93bd473267ee05c80
**Branch**: cursor/employer-directory-grid-b39b
**Repository**: baza

## Research Question

How can Baza add a public view listing all employers in a grid of cards (photo, name, address, offer count) that open company profiles on click — given what already exists for public profiles, offers, and navigation?

Original notes (`context/changes/employer-directory-grid/change.md`):

> chcialbym miec widok z lista wszystkich pracodawcow w gridzie po kliku otwieraly by sie ich profile. na grtidzie byli by cardami ze zdejciem nazwa, zdresem i liczba ofert

## Summary

A public company **profile** already exists; a public company **directory** does not.

- Click target is already live: unguarded `/companies/:id` loads `GET /api/companies/:id` and then published offers via `GET /api/companies/:id/offers`.
- There is **no** `GET /api/companies` collection, **no** `offerCount` field, **no** `/companies` index route, and **no** navbar link. Public nav is only “Oferty pracy”.
- Marketplace browse (`/`) is **offer-centric**: vertical glass cards, not a multi-column grid. Company logo/name/address appear on those cards as a nested link to the public profile.
- Data needed for a card already lives on `companies` (`name`, `base_location`, nullable `photo_urls`). Address is free-text `base_location` (no city/street split). Offer count must be computed as `count(job_offers where published = true)` in Nest (service_role) — not via anon PostgREST, and not via N+1 `GET /api/companies/:id/offers`.
- Product-wise this is **post-MVP discovery polish**: FR-002/FR-004 cover a single public profile and offers-on-that-profile, not an employer index. Roadmap F-01…S-06 are done; no directory slice exists.

Recommended shape for `/10x-plan`: extend `CompanyPublicController` with static `@Get()` **above** `@Get(':id')`, add a slim `@baza/shared-types` list DTO with `offerCount`, new unguarded FE `/companies` grid + shell link “Pracodawcy”, whole-card click → existing `/companies/:id`. Do not change the detail GET shape, do not reopen slugs or public RLS, do not displace `/` as Job Offers.

## Detailed Findings

### Public company API (GET-by-id only)

Global prefix is `api` ([`apps/baza-api/src/main.ts:21-22`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-api/src/main.ts#L21-L22)). JWT is not global; owner routes opt in with `@UseGuards(JwtAuthGuard)`.

[`CompanyPublicController`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-api/src/app/company/company-public.controller.ts) is unguarded `@Controller('companies')` with two handlers only:

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/api/companies/:id/offers` | none | `JobOffer[]` published only |
| `GET` | `/api/companies/:id` | none | `CompanyPublicProfile` |

```13:25:apps/baza-api/src/app/company/company-public.controller.ts
  @Get(':id/offers')
  listOffers(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<JobOffer[]> {
    return this.jobOfferService.listPublishedByCompany(id);
  }

  @Get(':id')
  getById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<CompanyPublicProfile> {
    return this.companyPublic.getById(id);
  }
```

[`CompanyPublicService.getById`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-api/src/app/company/company-public.service.ts#L10-L34) reads one `companies` row via the service-role client, 404s if missing, maps snake_case → camelCase, and rewrites photo URLs. It does **not** filter on “has published offers”. It does **not** expose `user_id` or `photo_key`.

Employer workspace stays on singular `/api/company/*` (JWT): session, profile PATCH, own offers. That split is intentional (S-01) and must not be used for the public directory.

Safe list addition: mirror [`OffersPublicController`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-api/src/app/company/offers-public.controller.ts#L35-L45) — put `@Get()` **above** `@Get(':id')`. Non-UUID segments on `:id` already 400 via `ParseUUIDPipe`. Module wiring already registers this controller ([`company.module.ts:14-18`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-api/src/app/company/company.module.ts#L14-L18)).

Tests lock get-by-id shape and 404 only ([`company-public.controller.spec.ts:31-68`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-api/src/app/company/company-public.controller.spec.ts#L31-L68)); there is no list/count contract.

### Shared types vs grid card fields

[`CompanyPublicProfile`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/libs/shared/types/src/lib/company.ts#L7-L17):

| Grid need | On profile type? |
|-----------|------------------|
| Photo | Yes — `photoUrls: Record<string, string> \| null` |
| Name | Yes — `name` |
| Address | Yes — `baseLocation` (text) |
| Offer count | **No** |

Also present on the profile type (not needed on a thin card): `nip`, `description`, `baseLat`/`baseLng`. No `CompanyListItem` / `offerCount` exists anywhere in `@baza/shared-types` ([`libs/shared/types/src/index.ts`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/libs/shared/types/src/index.ts)).

[`JobOffer`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/libs/shared/types/src/lib/job-offer.ts#L13-L35) already denormalizes `companyId`, `companyName`, `companyPhotoUrls`, `companyBaseLocationText`. That is enough to *derive* a unique-company set from `GET /api/offers`, but it **drops employers with zero published offers** and has no count without client-side grouping. Do not build the directory solely from the offers list if “wszystkich pracodawców” is literal.

**Recommendation:** new `CompanyDirectoryItem` (`id`, `name`, `baseLocation`, `photoUrls`, `offerCount`) rather than stuffing `offerCount` onto `CompanyPublicProfile` (keeps detail GET stable).

### Job offers: published-only semantics for `offerCount`

Public lists always filter `.eq('published', true)`:

- All offers: [`job-offer.service.ts:200-206`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-api/src/app/company/job-offer.service.ts#L200-L206)
- Per company: [`job-offer.service.ts:221-228`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-api/src/app/company/job-offer.service.ts#L221-L228)

There is no status enum; unpublished rows are `published = false`. Driver filters (countries, cadence, near, …) are applied **in memory after** the published query ([`job-offer.service.ts:213-217`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-api/src/app/company/job-offer.service.ts#L213-L217)) — **do not** apply those to directory `offerCount`.

No aggregation/count API exists. Calling `listPublishedByCompany` per card would be N+1. Indexes already support a join/group: `job_offers_company_id_idx` and partial `job_offers_published_idx` ([`20260910220000_job_offers_and_company_coords.sql:51-53`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/supabase/migrations/20260910220000_job_offers_and_company_coords.sql#L51-L53)).

Efficient pattern (single round-trip):

```sql
select c.id, c.name, c.base_location, c.photo_urls,
       count(j.id)::int as offer_count
from public.companies c
left join public.job_offers j
  on j.company_id = c.id and j.published = true
group by c.id;
```

Use `INNER JOIN` / `HAVING count > 0` only if product hides empty employers.

Offers list is unpaginated today; pagination for companies is optional unless density requires it.

### Data model, photos, address, RLS

**Companies (grid-relevant):** `id`, `name` varchar(120), `base_location` varchar(200) not null default `''`, `photo_urls` jsonb null, `photo_key` text (internal). Coords `base_lat`/`base_lng` exist for map pins, unused on a text-address card.

**Address:** free-text `base_location` only — no city/street/postal split. Empty string is valid. Grid “adres” = `baseLocation`.

**Photos:** register may insert `photo_urls: null`. Upload stores public R2 map `{ original, s48, s96, s192, s512 }` ([`r2-storage.service.ts:25-31`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-api/src/app/storage/r2-storage.service.ts#L25-L31)). Nest rewrites legacy S3 hosts without mutating DB ([`photo-url.util.ts:5-21`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-api/src/app/storage/photo-url.util.ts#L5-L21)). Fallback in FE: initial-letter placeholder (offer cards and public profile already do this). List-density picker: `s48` → `s96` → `original` ([`company-logo-url.ts:1-14`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-frontend/src/app/pages/job-offers/company-logo-url.ts#L1-L14)). Public profile prefers `s192` ([`company-public-profile.ts:66-77`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-frontend/src/app/pages/companies/company-public-profile.ts#L66-L77)). Directory cards should follow the **list** picker.

**RLS (latest wins):** both `companies` and `job_offers` revoked from `anon`/`authenticated`; only `service_role` has DML ([`20260911121000_companies_nest_only.sql`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/supabase/migrations/20260911121000_companies_nest_only.sql), [`20260911120000_job_offers_nest_only.sql`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/supabase/migrations/20260911120000_job_offers_nest_only.sql)). SPA cannot list companies via PostgREST. Directory **must** be Nest-backed, same as `getById`.

No SQL views/RPCs/aggregations in migrations.

### Frontend routes, profile page, navigation

[`app.routes.ts`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-frontend/src/app/app.routes.ts):

| Path | Component | Guard |
|------|-----------|-------|
| `''` | `JobOffersPage` (lazy) | none — driver home |
| `job-offers/:id` | `JobOfferDetailPage` | none |
| `companies/:id` | `CompanyPublicProfilePage` | **none** |
| `company/*` | employer workspace | `companyAuthGuard` |
| `**` | redirect `''` | — |

There is **no** `path: 'companies'` collection route. `/companies` currently falls through to `**` → home. Adding `{ path: 'companies', … }` is compatible with `companies/:id` (param is required).

Public profile load ([`company-public-profile.ts:37-46`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-frontend/src/app/pages/companies/company-public-profile.ts#L37-L46)): `HttpClient.get` `/api/companies/${id}`, then offers. Displays logo, name, NIP, `baseLocation`, description, published offer links ([`company-public-profile.html:20-75`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-frontend/src/app/pages/companies/company-public-profile.html#L20-L75)). Back link is “← Oferty” → `/`. Polish copy. 404 UI exists.

Pages call `HttpClient` directly with `${environment.apiBaseUrl}/api/...` (no dedicated API service). `authInterceptor` attaches Bearer only when a session exists; anonymous GET works.

Navbar ([`app-shell.html:7-14`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/libs/baza/ui/src/lib/app-shell/app-shell.html#L7-L14)): public primary nav is a single “Oferty pracy” `mat-button`. Natural insertion for “Pracodawcy” is the next sibling, always visible (before the logged-in employer branch). Do not put the directory under `/company/*`.

### Existing card / grid UI (reuse, do not copy-paste blindly)

Offer browse is a **single-column flex list**, not CSS grid ([`job-offers-page.scss:54-61`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-frontend/src/app/pages/job-offers/job-offers-page.scss#L54-L61)). Cards are custom `<article>` glass tiles (not `MatCard`) with logo, company name, location, then offer-specific pills ([`job-offers-page.html:100-137`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-frontend/src/app/pages/job-offers/job-offers-page.html#L100-L137), [`job-offers-page.scss:63-83`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/apps/baza-frontend/src/app/pages/job-offers/job-offers-page.scss#L63-L83)). Nested company `<a>` uses `stopPropagation` so the card still opens the offer.

Directory cards are simpler: **whole card → `/companies/:id`** (no nested competing link). Reuse visual tokens (glass bg, outline, logo + placeholder, location line). Invent a responsive `repeat(auto-fill, minmax(…))` grid — none exists today.

`@baza/ui` exports `AppShell`, `PageShell`, `AsyncStatus` ([`libs/baza/ui/src/index.ts`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/libs/baza/ui/src/index.ts)). No shared card/logo component. Use `baza-async-status` for loading / error+retry / empty (S-06 pattern on Job Offers). Public profile still uses ad-hoc paragraphs — directory should follow browse, not the older profile status copy, unless the plan also aligns the profile.

MVP UI language is Polish (`context/foundation/prd.md` NFR).

### Product / roadmap fit

PRD does **not** require an employer directory:

- **FR-002**: view/edit a public company profile after registration — single company ([`prd.md`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/context/foundation/prd.md) §Functional Requirements).
- **FR-004**: published offers on **that** company profile and in Job Offers list/map.
- Success criteria and US-01 are offer-filter → apply → inbox. Driver persona browses **Job Offers**, not companies.
- Directory is not listed under Non-Goals; it is simply absent. Secondary success explicitly deferred company-photo polish / employee-count / fleet fields — do not sneak those onto directory cards.

Roadmap F-01…S-06 are **done**. Parked items (payments, driver accounts, chat, i18n, pin clustering) do not include a company index. This change is a **new post-MVP slice**, not a missing must-have FR.

## Code References

- `apps/baza-api/src/app/company/company-public.controller.ts:6-26` — public companies controller; no list handler
- `apps/baza-api/src/app/company/company-public.service.ts:10-34` — single-row public read + photo rewrite
- `apps/baza-api/src/app/company/offers-public.controller.ts:35-45` — pattern for static `@Get()` before `:id`
- `apps/baza-api/src/app/company/job-offer.service.ts:200-228` — published-only lists (global and per company)
- `apps/baza-api/src/app/company/company.module.ts:12-25` — controller/service wiring
- `apps/baza-api/src/app/storage/r2-storage.service.ts:25-31` — photo URL variant keys
- `apps/baza-api/src/app/storage/photo-url.util.ts:5-21` — R2 public URL rewrite
- `libs/shared/types/src/lib/company.ts:7-17` — `CompanyPublicProfile` (no `offerCount`)
- `libs/shared/types/src/lib/job-offer.ts:13-35` — offer + denormalized company display fields
- `apps/baza-frontend/src/app/app.routes.ts:12-34` — public routes; `/companies/:id` only
- `apps/baza-frontend/src/app/pages/companies/company-public-profile.ts` — profile + offers HTTP load
- `apps/baza-frontend/src/app/pages/companies/company-public-profile.html` — Polish profile UI; click target for cards
- `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.html:100-137` — offer cards with nested company link
- `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.scss:54-83` — vertical list + glass card chrome
- `apps/baza-frontend/src/app/pages/job-offers/company-logo-url.ts:1-14` — list-size logo picker
- `libs/baza/ui/src/lib/app-shell/app-shell.html:7-14` — public nav insertion point
- `libs/baza/ui/src/index.ts` — `AsyncStatus` for directory empty/loading/error
- `supabase/migrations/20260911121000_companies_nest_only.sql` — Nest-only companies reads
- `supabase/migrations/20260911120000_job_offers_nest_only.sql` — Nest-only job_offers reads
- `supabase/migrations/20260910220000_job_offers_and_company_coords.sql:23-53` — `job_offers` + published indexes
- `apps/baza-api/src/app/company/company-public.controller.spec.ts:31-68` — public profile contract tests

## Architecture Insights

1. **Public vs employer namespaces are sacred.** `/companies` and `/api/companies` are anonymous marketplace surfaces. `/company` and `/api/company` are JWT employer workspace. Directory belongs on the plural public side.
2. **Nest is the only public data plane.** Restoring anon SELECT on `companies` would undo S-01/S-02 security (impl-review Fix B). Service-role + DTO stripping (`user_id`, `photo_key`) is the pattern.
3. **Contracts live in `@baza/shared-types` first** (repo guideline). Add a list DTO there before duplicating shapes in FE/API.
4. **Published boolean is the visibility primitive** for offers. Directory counts must use it, not owner `listForOwner`.
5. **Pages inject `HttpClient`**; no Angular API client layer to extend — a new page following job-offers/profile is consistent.
6. **Visual language is branded glass cards + Polish copy + `baza-async-status`**, not a new design system. Multi-column grid is new CSS, not a shared component.
7. **Lessons.md** (lock FE+BE+DB validation) barely applies unless the directory adds query filters with persisted params. If a query DTO appears (sort/search), apply the lesson.

## Historical Context (from prior changes)

- [`context/archive/2026-09-08-company-public-profile/plan.md`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/context/archive/2026-09-08-company-public-profile/plan.md) — S-01: `GET /api/companies/:id`, FE `/companies/:id`, UUID not slugs, Nest-only public reads, Polish copy, photo variant notes. Explicitly out of scope: slug URLs.
- [`context/archive/2026-09-10-publish-job-offer/`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/context/archive/2026-09-10-publish-job-offer/plan.md) — FR-004: published offers on company profile via `GET /api/companies/:id/offers`; public `GET /api/offers`.
- [`context/archive/2026-09-11-driver-browse-job-offers/`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/context/archive/2026-09-11-driver-browse-job-offers/plan.md) — browse is offer-centric (`/` = Job Offers). No company directory.
- [`context/archive/2026-09-13-job-offers-ui-ux/`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/context/archive/2026-09-13-job-offers-ui-ux/plan.md) — offer cards: logo/name → `/companies/:id`, card → offer detail. Directory should match that chrome but skip nested links.
- [`context/archive/2026-09-13-ux-improvements/research.md`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/context/archive/2026-09-13-ux-improvements/research.md) — `baza-async-status`; empty ≠ error; “Spróbuj ponownie”.
- Roadmap [`context/foundation/roadmap.md`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/context/foundation/roadmap.md) — no directory Change ID; all MVP slices done.

### Decisions that must be reused

- Click-through to existing `/companies/:uuid` (not `/company/profile`).
- UUID ids; no slugs.
- Nest + service_role for all public company/offer reads.
- Photo URLs from rewritten `photoUrls`; list cards prefer `s48`.
- Polish UI; `baza-async-status` for async states.
- `/` stays Job Offers — directory is secondary nav.

### Decisions that should not be reopened

- Human-readable company slugs.
- Client Supabase SELECT on `companies` / `job_offers`.
- Guarding `/companies/:id`.
- Replacing offer-centric home with a company directory.
- Multi-language UI, paid listings, driver accounts, map-of-companies (unless explicitly added to this change).

## Related Research

- [`context/archive/2026-09-10-publish-job-offer/research.md`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/context/archive/2026-09-10-publish-job-offer/research.md) — public vs guarded company/offers APIs
- [`context/archive/2026-09-11-driver-apply-via-map/research.md`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/context/archive/2026-09-11-driver-apply-via-map/research.md) — auth boundary: public GETs vs JWT employer paths
- [`context/archive/2026-09-13-ux-improvements/research.md`](https://github.com/miIoszek/baza/blob/4e98dc5592c58be169d6b1f93bd473267ee05c80/context/archive/2026-09-13-ux-improvements/research.md) — empty/loading/error patterns to copy
- No prior research designed `GET /api/companies` (collection) or an employer grid

## Open Questions

These are product/plan choices, not missing code facts:

1. **Inclusion:** show every registered company (`offerCount` may be `0`) vs only those with ≥1 published offer? Notes say “wszystkich pracodawców”; marketplace default would hide empties.
2. **Empty `baseLocation`:** hide the address line vs show a fallback such as “Brak adresu”?
3. **Sort:** `name` A–Z, newest company, or most published offers first? No `companies(name)` / `created_at` index today.
4. **Pagination:** follow offers (return all) vs add limit now? Current scale assumption is small (`prd.md` data_volume: small).
5. **Nav label / path:** Polish “Pracodawcy” at `/companies` is the obvious pair to “Oferty pracy”; confirm vs “Firmy”.
6. **Roadmap:** add an optional post-MVP slice (e.g. S-07) or keep this change folder-only?
7. **Profile back-link:** after landing from the directory, “← Oferty” still goes home — should it become “← Pracodawcy” when `navigation`/`query` came from the grid?

Planning constraints (for `/10x-plan`): extend `CompanyPublicController` / `CompanyPublicService` + shared list DTO; one aggregated Nest query; new unguarded `/companies` page + shell link; whole-card click to existing profile; match offer-card + async-status visuals; out of scope: slugs, RLS reopen, geocoding, map of companies, changing `GET /api/companies/:id` shape.
