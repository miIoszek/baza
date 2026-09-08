# Company Public Profile (S-01) Implementation Plan

## Overview

Deliver roadmap slice **S-01** / **FR-002**: after registration, a company can **view and edit** their profile, and anyone (including future drivers) can **view the public profile** at a stable URL. Replaces the F-01 placeholder at `/company/profile` and adds the first public company read surface the marketplace will link to in S-02.

**Prerequisite:** F-01 (`gate-company-routes`) merged — guarded `/company/*`, `CompanyModule`, `GET /api/company/session`.

## Current State Analysis

**Data (`companies` table):** `name`, `nip`, `description`, `base_location` (text), `photo_key`, `photo_urls` (JSON map). RLS allows **public SELECT**; update restricted to owner (`supabase/migrations/20260904120000_create_companies.sql`).

**Register:** `POST /api/auth/register` creates auth user + company row; optional R2 logo upload (`auth.service.ts`). FE lands on `/company/profile` after sign-in (`register.ts`).

**F-01 shell:** `/company/profile` shows `CompanyProfilePlaceholder` behind `companyAuthGuard`. `CompanyController` has guarded `GET /api/company/session` only.

**Shared types:** `AuthMeCompany` matches runtime data (`libs/shared/types/src/lib/auth.ts`). `CompanyPublicProfile` in `company.ts` is **stale** (`GeoPoint`, single `photoUrl`) and unused.

**Gaps:** No public company route, no `GET /api/companies/:id`, no profile update endpoint, no edit UI, no aligned public DTO.

### Key Discoveries

- Photo display pattern exists: `photoUrls['s96'] ?? s48 ?? original` in `AuthService.accountAvatarUrl` — reuse on profile pages.
- R2 upload pipeline (`uploadCompanyLogo`) is register-only today; profile photo change should reuse it with optional old-key cleanup.
- `base_location` is free text today; map pin / `GeoPoint` deferred to S-02 per roadmap — S-01 keeps text only.
- Lesson: lock validation FE + BE + sensible max lengths (`context/foundation/lessons.md`).

## Desired End State

1. **Public view:** `GET /api/companies/:id` returns public profile JSON (no auth). FE route `/companies/:id` renders read-only profile (logo, name, NIP, description, base location text).
2. **Owner edit:** `PATCH /api/company/profile` (JWT) updates own company fields + optional new logo. FE `/company/profile` shows edit form, success/error feedback, link to public URL.
3. **Contracts:** `CompanyPublicProfile` in `@baza/shared-types` aligned with DB (`baseLocation: string`, `photoUrls` map).
4. **Verification:** `npm run lint`, `npm run test`, `npm run build` green; manual smoke for public URL (logged out) and edit (logged in).

## What We're NOT Doing

- Job offers, map pin, geocoding (`GeoPoint`) — S-02
- Driver browse/apply routes — S-03/S-04
- Inbox — S-05
- Slug/human-readable URLs (use UUID `:id` for MVP)
- NIP uniqueness enforcement beyond register (edit allows same NIP for own row)
- Navbar redesign beyond optional “Profil firmy” link for logged-in users
- Replacing `GET /api/auth/me` with `/api/company/session` on FE (either works; keep `refreshMe()` on `/api/auth/me`)

## Implementation Approach

Three phases: **public read path** (API + unguarded FE), **owner edit path** (PATCH + gated form), **tests + CI**. Extend `CompanyController` for owner mutations; add a small **public** controller without `JwtAuthGuard` for `GET /api/companies/:id` so guard boundaries stay clear (same pattern F-01 used for public vs guarded split).

## Critical Implementation Details

**Ownership on PATCH:** Resolve company by `req.user.id` → `companies.user_id`; never accept `companyId` in body for authorization. Return 404 if no company row for user.

**Photo replace:** If new photo uploaded on PATCH, call existing R2 upload; on success update `photo_key` / `photo_urls`; best-effort delete previous prefix (same compensation mindset as register).

**Public vs employer URLs:** `/company/profile` = authenticated employer workspace. `/companies/:id` = public read — do not guard the latter.

**Validation parity:** Mirror register limits on shared fields — at minimum `name` ≥2, `nip` ≥10, non-empty `description` and `baseLocation`; add `@MaxLength` caps on Nest DTO and Angular validators (e.g. name 120, description 2000, baseLocation 200) per lessons.md.

---

## Phase 1: Public profile read (API + FE)

### Overview

Ship aligned shared contract, public read API, and unguarded public profile page.

### Changes Required

#### 1. Shared public contract

**File:** `libs/shared/types/src/lib/company.ts`

**Intent:** Make `CompanyPublicProfile` the canonical public read shape matching DB and `AuthMeCompany`.

**Contract:** Fields: `id`, `name`, `nip`, `description`, `baseLocation: string`, `photoUrls: Record<string, string> | null`. Remove or stop exporting stale `CreateCompanyRequest` / `GeoPoint` usage from this profile contract (GeoPoint remains in file for future job-offer work if still referenced elsewhere).

#### 2. Public read service + controller

**Files:** `apps/baza-api/src/app/company/company-public.service.ts`, `company-public.controller.ts`, update `company.module.ts`

**Intent:** Fetch company by primary key for anonymous consumers.

**Contract:** `GET /api/companies/:id` → `CompanyPublicProfile`; 404 when row missing. No JWT. Map DB columns including `photo_urls` → `photoUrls`, `base_location` → `baseLocation`. Do not expose `user_id`, `photo_key`, or internal keys.

#### 3. Public profile page (FE)

**Files:** `apps/baza-frontend/src/app/pages/companies/company-public-profile.ts` (+ template/styles), update `app.routes.ts`

**Intent:** Logged-out and logged-in users can open `/companies/:id` and see company info.

**Contract:** Route **without** `companyAuthGuard`. Load via `HttpClient.get<CompanyPublicProfile>(`/api/companies/:id`)`. Display logo using same variant precedence as navbar. Polish copy; 404 state when API returns not found.

### Success Criteria

#### Automated Verification

- `npm run lint` passes after Phase 1 changes
- `npx nx test baza-api` passes (include public controller spec)
- `npx nx build shared-types` or full `npm run build` includes updated exports

#### Manual Verification

- Logged out, open `/companies/<valid-uuid>` — public profile renders name, description, location, logo if present
- Invalid UUID / unknown id shows friendly not-found UI

**Implementation Note**: After automated checks pass, pause for manual confirmation before Phase 2.

---

## Phase 2: Owner profile edit (API + FE)

### Overview

Allow authenticated company owners to update profile fields and optional logo; replace F-01 placeholder with real edit UI.

### Changes Required

#### 1. Update DTO + service method

**Files:** `apps/baza-api/src/app/company/dto/update-company-profile.dto.ts`, extend `company.service.ts` (or `auth.service` helper if preferred — prefer dedicated company service to keep auth register separate)

**Intent:** Validated partial/full update of own company row.

**Contract:** `UpdateCompanyProfileDto`: `name`, `nip`, `description`, `baseLocation` with same validators as register + max lengths. `PATCH /api/company/profile` on **guarded** `CompanyController` with optional `photo` multipart (reuse register MIME/size limits). Returns `AuthMeResponse` or `AuthMeCompany` — pick one and use consistently (recommend `AuthMeCompany` for PATCH response to match edit form; FE calls `refreshMe()` after save).

#### 2. Replace profile placeholder

**Files:** replace `company-profile-placeholder.ts` with `company-profile-page.ts` (+ html/scss), optional `company-profile.service.ts` on FE

**Intent:** Owner edits profile at `/company/profile` (still behind `companyAuthGuard`).

**Contract:** Reactive form prefilled from `AuthService` / `refreshMe()`. Submit `FormData` or JSON + separate photo upload — match register multipart pattern for photo. On success: snackbar + refresh session. Show link/button to public profile `/companies/{company.id}`. Field-level validation messages (Polish) aligned with DTO.

#### 3. Optional shell link

**File:** `libs/baza/ui/src/lib/app-shell/app-shell.html` (or account area in `app.html`)

**Intent:** Logged-in users can reach profile without typing URL.

**Contract:** When `accountLabel` present, link account block or add `Profil firmy` button → `/company/profile`.

### Success Criteria

#### Automated Verification

- `npm run lint` passes after Phase 2 changes
- `npx nx test baza-api` and `npx nx test baza-frontend` pass for update path specs

#### Manual Verification

- Logged in at `/company/profile`, edit description and save — public `/companies/:id` reflects change when opened logged out
- Upload/replace logo on edit — new image on public profile and navbar avatar
- Validation errors show under fields for empty name, short NIP, etc.

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Tests and CI verification

### Overview

Fill test gaps and run full monorepo verification.

### Changes Required

#### 1. API tests

**Files:** `company-public.controller.spec.ts`, `company.controller` PATCH tests (extend existing spec or new)

**Intent:** Cover 404 on unknown id, 200 public shape, PATCH 401 without token, PATCH 200 for owner, validation 400.

#### 2. FE tests

**Files:** minimal specs for public profile component (404 + happy path with HttpTestingController) and profile edit form (validation or submit wiring)

**Intent:** Guard against regressions on S-01 routes.

#### 3. Full CI mirror

**Intent:** Run root scripts matching `.github/workflows/ci.yml`.

### Success Criteria

#### Automated Verification

- `npm run lint` passes
- `npm run test` passes (both apps)
- `npm run build` passes

#### Manual Verification

- End-to-end: register → land on edit profile → save → open public URL in incognito → see data
- Logout from `/company/profile` redirects home (F-01 fix)

---

## Testing Strategy

### Unit Tests

- Public controller: maps row → `CompanyPublicProfile`, 404
- Company controller PATCH: auth required, owner update, validation failures
- FE: public page HTTP mock; edit form invalid state

### Integration Tests

- None required for MVP (Supabase + R2 covered by unit mocks; manual E2E sufficient)

### Manual Testing Steps

1. Register new company (or use existing account).
2. Visit `/company/profile` — edit fields, save.
3. Open `/companies/{id}` logged out — verify public view.
4. Change logo on edit — verify public page + navbar.
5. Hit `/api/companies/{bad-id}` — 404.

## Performance Considerations

Negligible — single-row reads/writes; public page one GET per visit.

## Migration Notes

Not applicable — no schema change. Existing `companies` rows immediately gain public URLs by `id`.

## References

- Roadmap S-01: `context/foundation/roadmap.md`
- PRD FR-001, FR-002: `context/foundation/prd.md`
- F-01 plan: `context/changes/gate-company-routes/plan.md`
- Lessons: `context/foundation/lessons.md`
- Shared types: `libs/shared/types/src/lib/auth.ts`, `company.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Public profile read (API + FE)

#### Automated

- [ ] 1.1 `npm run lint` passes after Phase 1 changes
- [ ] 1.2 `npx nx test baza-api` passes after Phase 1 changes
- [ ] 1.3 Full build includes updated `@baza/shared-types` exports

#### Manual

- [ ] 1.4 Logged-out `/companies/:id` shows public profile; unknown id shows not-found

### Phase 2: Owner profile edit (API + FE)

#### Automated

- [ ] 2.1 `npm run lint` passes after Phase 2 changes
- [ ] 2.2 `npx nx test baza-api` and `npx nx test baza-frontend` pass after Phase 2 changes

#### Manual

- [ ] 2.3 Edit at `/company/profile` persists; public URL reflects changes; logo replace works

### Phase 3: Tests and CI verification

#### Automated

- [ ] 3.1 `npm run lint` passes
- [ ] 3.2 `npm run test` passes (both apps)
- [ ] 3.3 `npm run build` passes

#### Manual

- [ ] 3.4 Register → edit → public view smoke in incognito
