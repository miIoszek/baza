# Company Public Profile (S-01) — Plan Brief

> Full plan: `context/changes/company-public-profile/plan.md`

## What & Why

Companies must **view and edit a public profile** after registration (FR-002). Register already stores company data, and F-01 routes land users on `/company/profile`, but that page is still a placeholder — there is no public URL and no edit API. S-01 closes the gap before S-02 publishes job offers onto a profile.

## Starting Point

- DB: `companies` table with public RLS read; fields populated at register.
- API: `CompanyController` with guarded `GET /api/company/session` only.
- FE: gated `/company/profile` placeholder; no `/companies/:id`.
- Types: `AuthMeCompany` is accurate; `CompanyPublicProfile` is stale (GeoPoint / single photoUrl).

## Desired End State

Anyone can open **`/companies/:id`** and see the company’s public profile. The logged-in owner edits the same data at **`/company/profile`** via **`PATCH /api/company/profile`** (optional logo upload). Shared types and validation align across FE, API, and DB constraints.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Public URL | `/companies/:companyId` (unguarded) | Separates public read from employer `/company/*` workspace | Plan |
| Edit URL | Keep `/company/profile` (guarded) | F-01 landing + employer UX already wired | F-01 / Roadmap |
| Public API | `GET /api/companies/:id` without JWT | Clear boundary vs guarded `CompanyController` | Plan |
| Update API | `PATCH /api/company/profile` with JWT | Class-level guard pattern from F-01 | F-01 |
| Location field | Text `baseLocation` only | Matches register + DB; map/geocode in S-02 | Roadmap |
| Public type shape | Align `CompanyPublicProfile` with `AuthMeCompany` | One truth for name/nip/description/photoUrls | Research |
| Photo edit | Reuse R2 `uploadCompanyLogo` on PATCH | Pipeline exists from register | Archive logo-r2 |
| ID in URL | UUID primary key | No slug system in MVP | Plan |

## Scope

**In scope:** Public read API + page, owner edit API + form, shared type fix, validation parity, basic tests, optional navbar link to profile.

**Out of scope:** Offers, map pin, geocoding, slugs, inbox, driver routes, OAuth.

## Architecture / Approach

```
Public:  GET /api/companies/:id  →  FE /companies/:id  (no guard)

Owner:   PATCH /api/company/profile (+ photo)  →  FE /company/profile  (companyAuthGuard)
         Session via existing AuthService.refreshMe() / GET /api/auth/me
```

Nest: new public controller for read; extend guarded `CompanyController` for PATCH. Angular: standalone Material pages following register/login patterns.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Public read | Shared type, GET API, public FE page | Stale `CompanyPublicProfile` drift if not fixed first |
| 2. Owner edit | PATCH + form replacing placeholder | Photo replace + R2 cleanup edge cases |
| 3. Tests + CI | Specs, lint/test/build | Multipart PATCH testing |

**Prerequisites:** F-01 merged; Supabase + optional R2 env for logo tests.

## Open Risks & Assumptions

- F-01 manual verification items may still be open — confirm guards/session before or during S-01.
- Public profile exposes NIP and description — assumed acceptable per PRD public profile intent.
- Geocoding deferred; `baseLocation` displayed as text until S-02.

## Success Criteria (Summary)

- Public profile reachable at `/companies/:id` without login.
- Owner can edit and see changes on the public page.
- CI green (`lint`, `test`, `build`).
