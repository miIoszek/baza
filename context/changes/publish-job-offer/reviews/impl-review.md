<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Publish Job Offer (S-02)

- **Plan**: `context/changes/publish-job-offer/plan.md`
- **Scope**: Phase 1 of 1
- **Date**: 2026-09-11
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical / 5 warnings / 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Automated verification (re-run)

| Check | Result |
|-------|--------|
| `npm run lint` | PASS |
| `npm run test` | PASS (after `nx reset`; transient Nx SQLite FK 787) |
| `npm run build` | PASS |
| Migration / grants on remote | PASS (applied during implement; grants follow-up migration) |

## Manual (Progress)

All `1.5`–`1.9` marked `[x]` with SHA `f840a9c`; user confirmed manual smoke (“ok p[potestowalem i dziala”). Diff contains matching surfaces (forms, list, map, public profile, unpublish).

## Findings

### F1 — PATCH can skip publish-coords gate when `published` omitted

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-api/src/app/company/dto/job-offer.dto.ts:91-98`, `job-offer.service.ts:81,249-256`
- **Detail**: `CreateJobOfferDto.published` is `@IsOptional()`. `UpdateJobOfferDto` re-declares `@IsBoolean() published` but parent optional metadata can still allow omit. `assertCanPublish` uses `if (!published) return`, so `undefined` skips the coords gate. FE always sends `published` today; a raw API client could PATCH a published offer after clearing company coords.
- **Fix A ⭐ Recommended**: On update, resolve `nextPublished = dto.published ?? existing.published` and call `assertCanPublish(nextPublished, …)`; treat gate as `published === true`.
  - Strength: Fixes the product invariant even if DTO inheritance is messy; matches plan publish gate.
  - Tradeoff: Needs loading existing row before gate (already loaded for ownership).
  - Confidence: HIGH — clear control-flow bug.
  - Blind spot: Whether class-validator actually inherits `@IsOptional` on override in this Nest version (still safer to fix service).
- **Fix B**: Rebuild update DTO with `OmitType` + required `published` only.
  - Strength: Forces clients to always send status.
  - Tradeoff: Stricter API; still combine with `=== true` check.
  - Confidence: MEDIUM — decorator inheritance quirks.
  - Blind spot: Breaking any partial-update clients (none in FE today).
- **Decision**: FIXED via Fix A


- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-frontend/src/app/pages/job-offers/offers-map.ts:97-98`
- **Detail**: Title is `escapeHtml`'d; `href` is raw in `<a href="${pin.href}">`. Callers currently pass `/job-offers/${id}` only (low exploitability), but the helper is unsafe if `href` becomes API/user-controlled.
- **Fix**: Escape href for attributes (or build popup with DOM APIs / allow only paths starting with `/`).
- **Decision**: FIXED


- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: `company-profile-page.ts:62-63`, `company-offer-form-page.ts:77-79`, migration `job_offers` (no cadence/transport/routes CHECKs)
- **Detail**: Lesson requires locking FE+BE+DB. Profile lat/lng: BE/DB have ranges + pair; FE has no range/both-or-neither validators (one-sided submit clears both). Offer salary: BE enforces min≥0, currency length, min≤max; FE mostly lacks those. DB locks salary pair and lengths but not cadence/transport enums or routes non-empty (Nest-only).
- **Fix A ⭐ Recommended**: Add FE validators + mat-errors mirroring BE for coords and salary (quick UX/lesson compliance).
  - Strength: Matches lessons.md and S-01 polish; small FE change.
  - Tradeoff: Does not harden DB enums.
  - Confidence: HIGH.
  - Blind spot: None significant for FE path.
- **Fix B**: Also add DB CHECKs/`IN` for cadence/transport and `jsonb_array_length(routes) >= 1`.
  - Strength: Defense in depth if PostgREST is ever used for writes.
  - Tradeoff: Another migration; catalog changes need migrations.
  - Confidence: MEDIUM — Nest is the write path today.
  - Blind spot: RLS still allows owner DML (see F5).
- **Decision**: FIXED via Fix A


- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: `libs/shared/types/src/lib/job-offer.ts:30-50`, `dto/job-offer.dto.ts:73-89`, `company-offer-form-page.ts` body
- **Detail**: Plan/types use nested `salary?: SalaryRange` on create/update requests; API and FE send flat `salaryMin`/`salaryMax`/`salaryCurrency`. Read model still nests `salary` on `JobOffer`. Contract drift for any typed client using shared create/update types.
- **Fix A ⭐ Recommended**: Align shared create/update request types to flat fields (match wire + DTO).
  - Strength: Types match reality; one-file fix in shared-types.
  - Tradeoff: Diverges from nested read model shape (document in types).
  - Confidence: HIGH — FE/API already flat.
  - Blind spot: External consumers of nested request shape (none known).
- **Fix B**: Change DTO/FE to nested `salary` object.
  - Strength: Matches original type design.
  - Tradeoff: More churn; class-validator nested DTO work.
  - Confidence: MEDIUM.
  - Blind spot: Multipart/profile patterns irrelevant here.
- **Decision**: FIXED via Fix A


- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: `supabase/migrations/20260910220000_job_offers_and_company_coords.sql:70-95`
- **Detail**: Authenticated owners have INSERT/UPDATE RLS policies; no DB rule tying `published=true` to company coords. SPA holds anon key + JWT, so PostgREST can write offers without Nest’s Polish 400 gate (same Nest-only business-rule pattern as S-01 public reads).
- **Fix A ⭐ Recommended**: Document as accepted Nest-only invariant for MVP; track DB trigger/CHECK or drop owner write policies in a follow-up.
  - Strength: Honest scope; matches how S-01 treated Nest as API boundary.
  - Tradeoff: Risk remains for determined clients until follow-up.
  - Confidence: HIGH for “accept for MVP”.
  - Blind spot: Whether any client code talks to PostgREST for offers today (FE uses Nest).
- **Fix B**: Remove owner INSERT/UPDATE RLS (service_role Nest-only writes) or add trigger enforcing coords when published.
  - Strength: Closes bypass at DB.
  - Tradeoff: Migration + possible local tooling impact.
  - Confidence: MEDIUM.
  - Blind spot: Future direct Supabase clients.
- **Decision**: FIXED via Fix B — revoke anon/authenticated; Nest service_role only; drop owner RLS policies. Follow-up applied same model to `companies` (`20260911121000_companies_nest_only.sql`).


- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: N/A (no `company-offer-form-page.spec.ts` / coords validator specs)
- **Detail**: Plan asked for FE form/validator specs; API specs cover publish-without-coords, country/transport, salary, ownership. FE coverage is thin (profile NIP/description only).
- **Fix**: Add Vitest specs for offer form invalid routes/transport/salary and profile lat/lng both-or-neither.
- **Decision**: FIXED


- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-frontend/src/app/pages/companies/company-public-profile.ts:80-81`
- **Detail**: On offers GET failure, UI sets `offers` to `[]` with no error — indistinguishable from “no published offers”.
- **Fix**: Surface error/retry state similar to profile load failure.
- **Decision**: FIXED
