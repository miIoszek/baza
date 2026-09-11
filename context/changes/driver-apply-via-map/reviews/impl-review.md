<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Driver Apply via Map (S-04)

- **Plan**: context/changes/driver-apply-via-map/plan.md
- **Scope**: Phases 1–3 of 3 (full plan)
- **Date**: 2026-09-11
- **Verdict**: NEEDS ATTENTION → triaged (warnings addressed / F7 deferred)
- **Findings**: 0 critical 4 warnings 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Global ThrottlerGuard vs plan “apply+register only”

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: apps/baza-api/src/app/app.module.ts
- **Detail**: Plan NOT Doing forbids global API throttling beyond apply + register. Implementation registers `ThrottlerGuard` as `APP_GUARD` with a high default (120/min) on all routes, plus stricter `@Throttle(10/min)` on apply/register. Apply burst was verified (429), but browse/geo are also limited.
- **Fix A ⭐ Recommended**: Keep APP_GUARD with high default; document as intentional safety net in plan addendum (browse stays effectively unlimited for normal use).
  - Strength: Simple; protects against abuse without per-route guard boilerplate.
  - Tradeoff: Literal drift from “NOT Doing” wording.
  - Confidence: HIGH — default is generous; apply already stricter.
  - Blind spot: Multi-instance in-memory limits (see F7).
- **Fix B**: Remove APP_GUARD; attach `ThrottlerGuard` only on register + apply routes.
  - Strength: Matches plan literally.
  - Tradeoff: Easy to forget on future sensitive routes.
  - Confidence: HIGH.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A — plan addendum: high default APP_GUARD per-IP is intentional; apply/register stay at 10/min

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: apps/baza-api/src/app/storage/r2-storage.service.ts (`getPrivateConfig`)
- **Detail**: Config only requires `R2_PRIVATE_BUCKET`; no assert that it differs from `R2_BUCKET`. Misconfig could place CVs in the public logo bucket.
- **Fix**: Reject upload/boot when `R2_PRIVATE_BUCKET === R2_BUCKET` (or empty private).
  - Strength: Hard-fails privacy footgun.
  - Tradeoff: One guard + test.
  - Confidence: HIGH.
  - Blind spot: Shared credentials across buckets are still OK when names differ.
- **Decision**: FIXED — reject private config when `R2_PRIVATE_BUCKET === R2_BUCKET` (log + treat as not configured)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: apps/baza-api/src/app/company/offers-public.controller.ts (FileInterceptor limits)
- **Detail**: Multer `LIMIT_FILE_SIZE` often surfaces as non-HttpException → global filter 500, not Polish 400. FE gates help; raw API callers do not.
- **Fix**: Map `MulterError` / `LIMIT_FILE_SIZE` to `BadRequestException('Plik CV jest zbyt duży (max 5 MB)')`.
- **Decision**: FIXED — AllExceptionsFilter maps Multer LIMIT_FILE_SIZE to Polish 400 (CV-specific message when field=`cv`)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: apps/baza-api/src/app/storage/r2-storage.service.ts (`deletePrefixInBucket`)
- **Detail**: Best-effort private prefix delete swallows errors with no log, so failed insert + failed cleanup leaves PII orphans without signal.
- **Fix**: Log delete failures (bucket + prefix); keep best-effort semantics.
- **Decision**: FIXED — log deletePrefix failures with bucket + prefix; keep best-effort

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: apps/baza-frontend/.../application-form.helpers.spec.ts; no detail-page HTTP mock
- **Detail**: Plan asked FE specs for consent/PDF/size and success-path HTTP mock. Helpers cover PDF/size/phone; company publish gate has a unit test. Detail-page apply success + consent `requiredTrue` are not component-tested.
- **Fix**: Add a thin detail-page (or form) spec with HttpTestingController happy path + consent invalid; or document helper coverage as sufficient.
- **Decision**: FIXED — added `job-offer-detail-page.spec.ts` (consent blocks POST; happy-path multipart → success)

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: libs/shared/types/.../application.ts; migration `20260911220000_job_applications_phone_format.sql`
- **Detail**: Plan locked phone to length ≤32; product follow-up added digit/format validation FE+BE+DB (lesson-aligned). Extra migration deletes rows that fail the new CHECK.
- **Fix**: Keep as intentional product hardening (already shipped); no rollback needed for MVP.
- **Decision**: FIXED — tightened phone to max 16 chars / 9–15 digits everywhere (shared + Nest + DB migration); was product follow-up beyond original ≤32 plan

- **Severity**: 💬 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: ThrottlerModule.forRoot (default storage)
- **Detail**: Apply/register limits are per process; Railway multi-replica weakens caps.
- **Fix**: Defer until multi-replica; then shared store (Redis) if needed.
- **Decision**: SKIPPED — defer shared throttle store until multi-replica; in-memory per-process OK for MVP

## Triage summary

- Fixed: F1 (Fix A), F2, F3, F4, F5, F6
- Skipped: F7 (defer Redis/shared store)
