<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Driver Apply via Map (S-04)

- **Plan**: context/changes/driver-apply-via-map/plan.md
- **Mode**: Deep
- **Date**: 2026-09-11
- **Verdict**: SOUND
- **Findings**: 0 critical 3 warnings 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

6/6 paths ✓ (`job-offer-detail-page.ts`, `offers-map.ts`, `r2-storage.service.ts`, `job-offer.service.ts`, `application.ts`, `company-offer-form-page.ts`), symbols ✓ (`assertCanPublish`, `getConfig`+`R2_PUBLIC_URL`, no throttler/decorator yet), brief↔plan ✓. No `docs/reference/contract-surfaces.md`.

## Findings

### F1 — Public R2 bucket may still expose CV by URL

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Blind Spots
- **Location**: Phase 1 — Private CV upload / Critical Implementation Details
- **Detail**: Manual criteria say CV must not be fetchable via public R2 URL, but logos use a bucket reached through `R2_PUBLIC_URL`. If the same public binding serves all keys, `applications/…/cv.pdf` is world-readable once the key (or URL) leaks. Plan never specifies a private bucket, prefix deny, or non-public binding.
- **Fix A ⭐ Recommended**: Document in plan: private CV uses a **separate private bucket** (or R2 binding without public URL) + keys never returned to clients; keep logos on public bucket.
  - Strength: Matches GDPR “only receiving company” and makes S-05 download the only access path.
  - Tradeoff: Extra env (`R2_PRIVATE_BUCKET` / credentials) and config split.
  - Confidence: HIGH — current `getConfig()` already couples uploads to `R2_PUBLIC_URL`.
  - Blind spot: Exact Cloudflare dashboard binding names not verified in-repo.
- **Fix B**: Same public bucket but document that objects under `applications/` must not be on the public custom domain (worker/signed access only).
  - Strength: One bucket to operate.
  - Tradeoff: Easy to misconfigure; accidental public listing is a silent breach.
  - Confidence: MEDIUM — ops-dependent.
  - Blind spot: Current bucket policy not inspected from code.
- **Decision**: FIXED via Fix A — separate private R2 bucket/binding for CVs; plan Critical Details + Phase 1 CV contract + brief updated

### F2 — `getConfig()` always requires `R2_PUBLIC_URL`

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Phase 1 — Private CV / Critical Implementation Details
- **Detail**: Plan says CV must work without `R2_PUBLIC_URL`, but `getConfig()` returns null without it (`r2-storage.service.ts:31-46`), and `uploadCompanyLogo` / `getClient` / `deletePrefix` all use that helper. Without an explicit split, implementers will either leave CV blocked or accidentally reuse public config.
- **Fix A ⭐ Recommended**: Plan contract: split `getPublicConfig()` vs `getPrivateConfig()` (private needs account/keys/bucket only); `uploadApplicationCv` + private `deletePrefix` use private config; logos unchanged.
  - Strength: Makes Critical Implementation Details actionable; unblocks local/prod without public URL for CV.
  - Tradeoff: Small refactor + tests for both config paths.
  - Confidence: HIGH — confirmed in code.
  - Blind spot: None significant.
- **Fix B**: Reuse `getConfig()` but make `R2_PUBLIC_URL` optional when calling CV upload only.
  - Strength: Smaller diff.
  - Tradeoff: Ambiguous `isConfigured()` semantics for logo vs CV.
  - Confidence: MEDIUM.
  - Blind spot: Register/profile still need public URL.
- **Decision**: FIXED via Fix A — getPublicConfig vs getPrivateConfig + isPrivateConfigured; plan Critical Details + Phase 1 CV contract updated

### F3 — Apply field max lengths not specified (lesson prior)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 — Migration + shared types / lessons.md
- **Detail**: Lesson requires FE+BE+DB length/type constraints. Plan says “length CHECKs” and validators but never names limits for `email`, `phone`, `message`, or consent wire format — implementer will invent inconsistent numbers.
- **Fix**: Add concrete limits to Phase 1 Contract (e.g. email ≤254, phone ≤32, message ≤2000; consent multipart `'true'`/`'1'` → `consent_accepted_at`). Mirror in Nest DTO + FE mat-errors + DB CHECKs.
- **Decision**: FIXED — limits locked in Phase 1 types/migration/Nest/FE contracts; message remains optional (not removed)

### F4 — Proactive publish disable needs profile coords the form never loads

- **Severity**: 💭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 3 — Company publish FE clarity
- **Detail**: Plan optionally disables publish when coords missing “if profile data is already loaded,” but `company-offer-form-page` does not fetch profile lat/lng today; Nest errors already surface via snackBar. Optional path is underspecified.
- **Fix**: Either (a) require GET company profile on offer form and disable publish when coords null, or (b) drop proactive disable — snackBar + explicit profile link copy only.
- **Decision**: FIXED via (a) — coords required; load profile on offer form; disable publish without lat/lng; Nest gate kept

### F5 — Multipart `consentAccepted` boolean coercion unspecified

- **Severity**: 💭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 — Shared types / Apply Nest surface
- **Detail**: Multipart fields are strings; `@Transform` / allowlist for `'true'|'1'` vs boolean is not stated — easy 400 false-negatives.
- **Fix**: One sentence in Phase 1 Contract: accept `'true'`/`'1'`/`true`; reject otherwise; set `consent_accepted_at = now()` only when accepted.
- **Decision**: FIXED — consent wire rules added with F3 into Phase 1 Nest/apply contract
