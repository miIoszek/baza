<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Auth Company Logo R2

- **Plan**: `context/changes/auth-company-logo-r2/plan.md`
- **Scope**: Phase 1–2 of 2 (full plan)
- **Date**: 2026-09-04
- **Verdict**: REJECTED
- **Findings**: 1 critical, 5 warnings, 2 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | FAIL    |
| Architecture        | PASS    |
| Pattern Consistency | WARNING |
| Success Criteria    | WARNING |

## Findings

### F1 — Orphaned Auth user / R2 objects on partial register failure

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-api/src/app/auth/auth.service.ts` (~54–126)
- **Detail**: Register order is createUser/signUp → optional R2 upload → companies insert. Failure after user create leaves Auth users (and possibly R2 keys) with no company row and no compensation/delete.
- **Fix A ⭐ Recommended**: On failure after user create, compensate: admin.deleteUser + best-effort delete R2 prefix; map insert errors clearly.
  - Strength: Keeps current UX; closes orphan class.
  - Tradeoff: Needs service-role for deleteUser on anon-signup path too.
  - Confidence: HIGH — standard compensate pattern.
  - Blind spot: Concurrent double-submit edge cases.
- **Fix B**: Upload photo only after successful company insert (two-phase / update row).
  - Strength: Avoids R2 orphans; simpler mental model for files.
  - Tradeoff: Still need Auth user rollback if insert fails; extra update round-trip.
  - Confidence: MEDIUM.
  - Blind spot: Partial update race if client retries.
- **Decision**: FIXED via Fix A (compensate deleteUser + R2 prefix)

### F2 — Live Supabase anon URL/key committed in environment*.ts

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-frontend/src/environments/environment.ts`, `environment.production.ts`
- **Detail**: Real `wmmlour…` project URL + anon JWT hardcoded in git-tracked sources. Anon is “public by design” but AGENTS.md prefers names-only in repo + inject at build; keys are now in history.
- **Fix A ⭐ Recommended**: Replace with placeholders; inject via Pages/build env / fileReplacements; keep real values only in local `.env` (not committed).
  - Strength: Aligns with repo hard rules.
  - Tradeoff: Local/CI wiring needs a small bootstrap step.
  - Confidence: HIGH.
  - Blind spot: Whether Pages already has env wiring for Angular.
- **Fix B**: Keep anon in FE (document as public) but rotate key if repo was ever public; never commit service role.
  - Strength: Zero friction for local demos.
  - Tradeoff: Repo still carries project binding; harder to fork safely.
  - Confidence: MEDIUM.
  - Blind spot: Git history already has keys.
- **Decision**: FIXED — secrets in gitignored `environment.local.ts`; placeholders committed

### F3 — Upload MIME allowlist too loose (`image/*`)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-api/src/app/auth/auth.controller.ts` (~30–35)
- **Detail**: Accepts any `image/*` including SVG; original uploaded to public R2 with client MIME — XSS/content-type risk.
- **Fix**: Allowlist `image/jpeg`, `image/png`, `image/webp` only; prefer sharp metadata / magic bytes; set Content-Type from detected type.
- **Decision**: FIXED — jpeg/png/webp + sharp magic-byte check

### F4 — Partial R2 uploads / unmapped sharp failures

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-api/src/app/storage/r2-storage.service.ts` (~91–99)
- **Detail**: Sequential PutObject without cleanup; corrupt images can 500 mid-loop leaving orphan objects under `companies/{userId}/logo/`.
- **Fix**: Validate with sharp.metadata first (400 on decode fail); on any put failure, best-effort delete keys under `baseKey`.
- **Decision**: FIXED — validate metadata, cleanup prefix on failure

### F5 — Multer fileFilter throws generic Error (often 500)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `apps/baza-api/src/app/auth/auth.controller.ts` (~31–32)
- **Detail**: `cb(new Error(...), false)` does not match Nest `BadRequestException` pattern used elsewhere in auth.
- **Fix**: Reject with `BadRequestException` (or MulterExceptionFilter mapping to 400).
- **Decision**: SKIPPED — note in follow-ups/backend-error-handling.md + TODO on controller

### F6 — FE file picker has no type/size checks

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `apps/baza-frontend/src/app/pages/register/register.ts` (~75–83)
- **Detail**: Native file input accepts anything; relies on server. Poor UX; large payloads hit API first.
- **Fix**: Mirror server allowlist + 5MB max in `onPhotoSelected`; snackbar + clear input on reject.
- **Decision**: FIXED — FE allowlist jpeg/png/webp + 5MB

### F7 — Manual Progress items likely rubber-stamped

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `plan.md` Progress 1.2 / 2.2
- **Detail**: Manual “Five R2 objects when configured” and “small URL after register” marked `[x]` without durable evidence in repo; R2 often unset locally (photo → 503).
- **Fix**: Re-verify with R2 configured or revert those checkboxes to `[ ]` until proven.
- **Decision**: ACCEPTED — explained to user (checkbox honesty)

### F8 — Desired end-state “navbar s96” not wired

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: AppShell / AuthService account UI
- **Detail**: `/auth/me` returns `photoUrls` but navbar does not render `s96`. Phase 2 only required register preview — not phase DRIFT; gap vs Desired End State blurb.
- **Fix**: Defer to follow-up change or add tiny avatar beside company name.
- **Decision**: FIXED — navbar avatar uses s96 (fallback s48/original) + letter placeholder

## Automated verification (re-run 2026-09-04)

| Check | Result |
| ----- | ------ |
| `npx nx build baza-api` | PASS |
| `npx nx build baza-frontend` | PASS (budget warning >500kb) |
| `npx nx test baza-frontend` | PASS (2/2) |
