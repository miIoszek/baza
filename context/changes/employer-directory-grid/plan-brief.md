# Employer Directory Grid — Plan Brief

> Full plan: `context/changes/employer-directory-grid/plan.md`
> Research: `context/changes/employer-directory-grid/research.md`

## What & Why

Drivers and guests should browse **all employers** as a simple card grid (photo, name, address, published-offer count) and open the existing public profile on click. This is post-MVP discovery polish, kept as small as possible: no filters, no pagination, no map.

## Starting Point

Public profile `GET /api/companies/:id` and FE `/companies/:id` already work. There is no collection API, no `offerCount`, no `/companies` index, and no navbar entry. Job Offers remains home.

## Desired End State

Navbar **Pracodawcy** opens `/companies`: every registered company, newest first, glass cards, whole-card click → `/companies/:id`. Zero published offers still show (`Oferty: 0`). Profile GET shape is unchanged.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Inclusion | All registered companies | User: “zwracamy wszystkich”; zero-offer cards keep `offerCount: 0` | Plan (user) |
| Sort | `created_at DESC`, tie-break `id DESC` | User: “od najnowszego”; id tie-break is stability only | Plan (user) |
| Scope | MVP-thinnest slice | User: “jak najprościej / to tylko mvp” | Plan (user) |
| Count | Published offers only | Matches driver-visible offers; ignore unpublished | Research |
| Pagination / filters | None — return the full list | Same as `GET /api/offers`; volume is small | Research + Plan |
| Empty address | Hide the line | Same as offer cards | Research + Plan |
| Nav / path | “Pracodawcy” → `/companies` | Pair to “Oferty pracy”; public plural namespace | Research |
| Aggregation | Two Nest queries + in-memory count | No RPC/migration; matches existing list-then-reduce style | Plan |
| List DTO | New `CompanyDirectoryItem` | Do not overload `CompanyPublicProfile` | Research |
| Profile back-link | Unchanged (“← Oferty”) | Extra UX out of MVP | Plan |
| Home | `/` stays Job Offers | Directory is secondary | Research |

## Scope

**In scope:** `CompanyDirectoryItem`; unguarded `GET /api/companies`; `/companies` grid; navbar link; unit tests; Polish copy.

**Out of scope:** filters/search/pagination; hiding empty employers; slugs; PostgREST; SQL views; map; changing profile GET; `/company/*`; roadmap/PRD edits.

## Architecture / Approach

Public Nest controller gains a static `GET /api/companies` (registered above `:id`). Service-role reads all `companies` newest-first, counts `job_offers.published = true` in memory, rewrites photo URLs. Angular lazy page at `/companies` uses `HttpClient` + `baza-async-status` + offer-card chrome. Click navigates to the existing profile.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Contract + API | `GET /api/companies` all / newest / `offerCount` | Nest `@Get()` vs `:id` ordering |
| 2. Grid + nav | `/companies` cards + “Pracodawcy” | Visual drift from offer cards; `/` regression |

**Prerequisites:** Public profile + published offers already on `main` (S-01/S-02).  
**Estimated effort:** ~2 sessions across 2 phases.

## Open Risks & Assumptions

- Unpaginated list stays fine at current company counts; no `created_at` index.
- In-memory offer counting is enough until offer volume grows.
- Equal `created_at` is rare; `id DESC` tie-break is not shown in the UI.

## Success Criteria (Summary)

- Logged-out visitor opens Pracodawcy and sees every company, newest first, with photo/name/address/`Oferty: N`.
- Card click opens the existing public profile; Job Offers home is unchanged.
- `GET /api/companies/:id` response shape does not gain directory-only fields.
