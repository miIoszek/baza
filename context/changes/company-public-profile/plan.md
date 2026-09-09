# Company Public Profile (S-01) Implementation Plan

## Overview

Deliver roadmap slice **S-01** / **FR-002**: after registration, a company can **view and edit** their profile, and anyone (including future drivers) can **view the public profile** at a stable URL. Replaces the F-01 placeholder at `/company/profile` and adds the first public company read surface the marketplace will link to in S-02.

**Prerequisite:** F-01 (`gate-company-routes`) merged — guarded `/company/*`, `CompanyModule`, `GET /api/company/session`.

## Current State Analysis

**Phase 1 done (public read):** `CompanyPublicProfile` aligned with DB/`AuthMeCompany` (`libs/shared/types/src/lib/company.ts`). `GET /api/companies/:id` via unguarded `CompanyPublicController` + `CompanyPublicService`. FE `/companies/:id` renders public profile without `companyAuthGuard`. Progress §Phase 1 fully checked.

**Still open for Phase 2–3:**

**Data (`companies` table):** `name`, `nip`, `description`, `base_location` (text), `photo_key`, `photo_urls` (JSON map). RLS allows **public SELECT**; update restricted to owner (`supabase/migrations/20260904120000_create_companies.sql`). No schema change required for S-01.

**Register:** `POST /api/auth/register` creates auth user + company row; optional R2 logo upload (`auth.service.ts`). FE lands on `/company/profile` after sign-in (`register.ts`). Validation today is floors-only on Nest (`MinLength`, `@IsEmail`) — **no `@MaxLength`**, NIP is `@MinLength(10)` not exact 10 digits; FE register lacks `minLength(2)` on name and max-length caps (photo MIME + 5 MB already enforced on FE + `FileInterceptor`).

**F-01 / employer shell:** `/company/profile` still shows `CompanyProfilePlaceholder` behind `companyAuthGuard`. `CompanyController` has guarded `GET /api/company/session` only — **no** `CompanyService`, **no** PATCH, **no** `dto/` yet.

**Gaps remaining:** No profile update endpoint, no edit UI, register/edit validation not yet locked to the strict shared policy below.

### Key Discoveries

- Photo display: navbar uses `s96 ?? s48 ?? original`; public page uses `s192 ?? s512 ?? s96 ?? original` (cosmetic drift — optional align later).
- R2 `uploadCompanyLogo` writes a **versioned** prefix `companies/${userId}/logos/{uuid}` and stores new `photo_key` / `photo_urls`; after successful profile update, best-effort `deletePrefix` removes the previous key (including legacy `…/logo`).
- `base_location` is free text today; map pin / `GeoPoint` deferred to S-02 — S-01 keeps text only.
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

**Photo replace:** Each upload uses a unique R2 prefix `companies/{userId}/logos/{uuid}/` and stores new `photo_key` + `photo_urls` on the company row. After a successful DB update, best-effort `deletePrefix(previousPhotoKey)` removes the prior version (including legacy `companies/{userId}/logo`). On upload/DB failure, delete only the newly uploaded prefix. Do not use `?v=` cache-bust query params.

**Public vs employer URLs:** `/company/profile` = authenticated employer workspace. `/companies/:id` = public read — do not guard the latter.

**Strict validation (register + PATCH + FE, locked together):** Apply the same field rules on `RegisterCompanyDto`, `UpdateCompanyProfileDto`, register form, and edit form. Photo rules apply wherever upload is accepted (register + PATCH).

| Field | Rule |
| ----- | ---- |
| `email` | Valid email (`@IsEmail` / `Validators.email`) — register only |
| `password` | Min 8 chars — register only |
| `name` | Min 2, max 120 |
| `nip` | Exactly **10 digits** (`Matches(/^\d{10}$/)` / pattern validator) — not “≥10” |
| `description` | Min 1, max 2000 |
| `baseLocation` | Min 1, max 200 |
| `photo` (optional) | JPEG/PNG/WebP only; **max 5 MB** (`FileInterceptor` limits + FE pre-check); reject with clear Polish error |

Phase 2 **updates register** (Nest DTO + `register.ts`) to this policy while adding PATCH — do not leave register looser than edit.

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

#### 1. Strict shared validation + update DTO + service

**Files:**
- `apps/baza-api/src/app/auth/dto/register-company.dto.ts` — tighten to the strict table above
- `apps/baza-frontend/src/app/pages/register/register.ts` — FE validators + keep/confirm photo 5 MB + MIME
- `apps/baza-api/src/app/company/dto/update-company-profile.dto.ts` (new)
- `apps/baza-api/src/app/company/company.service.ts` (new) — prefer dedicated company service; keep auth register separate
- extend guarded `company.controller.ts`

**Intent:** One validation policy for company profile fields; validated update of own company row.

**Contract:** `UpdateCompanyProfileDto` mirrors register field rules for `name`, `nip`, `description`, `baseLocation`. `PATCH /api/company/profile` with optional `photo` multipart (same MIME + **5 MB** as register). Ownership via `req.user.id` → `companies.user_id` only. Returns `AuthMeCompany`; FE calls `refreshMe()` after save. Photo path: versioned `uploadCompanyLogo` + persist new URLs; best-effort delete previous `photo_key`.

#### 2. Replace profile placeholder

**Files:** replace `company-profile-placeholder.ts` with `company-profile-page.ts` (+ html/scss), optional `company-profile.service.ts` on FE

**Intent:** Owner edits profile at `/company/profile` (still behind `companyAuthGuard`).

**Contract:** Reactive form prefilled from `AuthService` / `refreshMe()` with the **same strict validators** as register (NIP exactly 10 digits, max lengths, etc.). Submit `FormData` multipart matching register for photo. On success: snackbar + refresh session. Show link/button to public profile `/companies/{company.id}`. Field-level validation messages (Polish) aligned with DTO.

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
- Upload/replace logo on edit — new image on public profile and navbar avatar (old logo not wiped by mistaken cleanup)
- Validation errors show under fields: empty name, NIP not exactly 10 digits, over-max description, invalid email on register, photo > 5 MB rejected
- Register form rejects the same invalid cases (parity with edit)

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Tests and CI verification

### Overview

Fill test gaps and run full monorepo verification.

### Changes Required

#### 1. API tests (new / extend — do not rewrite Phase 1 public specs)

**Files:** `company.controller` PATCH tests (extend `company.controller.spec.ts` or new); optionally extend existing `company-public.controller.spec.ts` only if a regression gap appears. Add/adjust register DTO validation coverage for NIP exact-10 + MaxLength if not already covered.

**Intent:** PATCH 401 without token, PATCH 200 for owner, validation 400 (bad NIP, over-max fields). Keep Phase 1 public 200/404 specs as-is.

#### 2. FE tests

**Files:** minimal specs for profile edit form (strict validators / submit wiring); optional public profile HttpTestingController specs if missing.

**Intent:** Guard against regressions on S-01 edit path and validation parity.

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

- [x] 1.1 `npm run lint` passes after Phase 1 changes — 6ddc37a
- [x] 1.2 `npx nx test baza-api` passes after Phase 1 changes — 6ddc37a
- [x] 1.3 Full build includes updated `@baza/shared-types` exports — 6ddc37a

#### Manual

- [x] 1.4 Logged-out `/companies/:id` shows public profile; unknown id shows not-found

### Phase 2: Owner profile edit (API + FE)

#### Automated

- [x] 2.1 `npm run lint` passes after Phase 2 changes — eb980db
- [x] 2.2 `npx nx test baza-api` and `npx nx test baza-frontend` pass after Phase 2 changes — eb980db

#### Manual

- [x] 2.3 Edit at `/company/profile` persists; public URL reflects changes; logo replace works; strict validation (NIP 10 digits, max lengths, photo ≤5 MB) on edit + register — eb980db

### Phase 3: Tests and CI verification

#### Automated

- [x] 3.1 `npm run lint` passes
- [x] 3.2 `npm run test` passes (both apps)
- [x] 3.3 `npm run build` passes

#### Manual

- [x] 3.4 Register → edit → public view smoke in incognito
