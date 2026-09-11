<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Driver Browse Job Offers (S-03)

- **Plan**: context/changes/driver-browse-job-offers/plan.md
- **Scope**: Phases 1–3 of 3 (full plan)
- **Date**: 2026-09-11
- **Verdict**: APPROVED
- **Findings**: 0 critical 3 warnings 3 observations
- **Triage**: COMPLETE — all FIXED

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Success criteria verification (re-run 2026-09-11)

| Check | Result |
|-------|--------|
| `npm run lint` | PASS |
| `npx nx test baza-api` | PASS (14 suites / 56 tests) |
| `npx nx test baza-frontend` | PASS (7 files / 24 tests) |
| `npm run build` | PASS |
| Migration file present | PASS (`20260911180000_job_offers_license_category.sql`) |
| Manual Progress 1.4–3.5 | All `[x]` with SHAs; confirmed by user in session |

## Findings

### F1 — Concurrent filter fetches can show stale results

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts:175-179, 247-262
- **Detail**: `queryParamMap.subscribe` calls `loadOffers` with bare HTTP `subscribe` and no cancel/`switchMap`. Fast filter changes can resolve out of order and leave the UI on an older result set.
- **Fix A ⭐ Recommended**: Drive loads with `queryParamMap.pipe(switchMap(...))` (or abort previous request) so only the latest query wins.
  - Strength: Standard Angular race fix; small change localized to browse page.
  - Tradeoff: Slightly more RxJS wiring.
  - Confidence: HIGH — common pattern for query-driven lists.
  - Blind spot: None significant.
- **Fix B**: Debounce query changes 150–300ms only.
  - Strength: Fewer requests.
  - Tradeoff: Does not fully prevent out-of-order responses.
  - Confidence: MEDIUM.
  - Blind spot: Still needs cancel under slow networks.
- **Decision**: FIXED via Fix A + debounceTime(200) before switchMap; filters update immediately via tap

### F2 — Nest validation errors not surfaced on browse page

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts:265-269
- **Detail**: `extractError` only accepts `message: string`. ValidationPipe often returns `message: string[]` → generic “Nie udało się pobrać ofert” for bad shared URLs. Company form already joins arrays.
- **Fix**: Mirror company-offer-form: join array messages (optionally clear bad query params).
- **Decision**: FIXED

### F3 — Empty `nearLat`/`nearLng` query values coerce to `0`

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: apps/baza-api/src/app/company/dto/list-offers-query.dto.ts:40-52
- **Detail**: `@Type(() => Number)` turns empty strings into `0`. Pair validation then accepts `(0, 0)` as a real near sort (Null Island). Company profile DTO maps `''` → `null` via `toOptionalNumber`.
- **Fix A ⭐ Recommended**: Same empty→`null` transform as profile coords DTO.
  - Strength: Matches existing Nest pattern; prevents bogus sort.
  - Tradeoff: Tiny DTO change + one unit test.
  - Confidence: HIGH — pattern already in repo.
  - Blind spot: None significant.
- **Fix B**: Reject empty near params with 400 in `parseListQuery`.
  - Strength: Explicit failure.
  - Tradeoff: Harsher for malformed share links.
  - Confidence: HIGH.
  - Blind spot: FE must avoid emitting empty near keys (mostly already does).
- **Decision**: FIXED via Fix A (empty→null transform)

### F4 — Public `countries` query is an unbounded free string

- **Severity**: 💭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: apps/baza-api/src/app/company/dto/list-offers-query.dto.ts:17-28
- **Detail**: Cadence/license use `@IsIn`; countries only split/uppercase. Not SQL injection (in-memory match), but weaker than create-route country allowlist.
- **Fix**: Cap length and validate tokens against `COUNTRY_CODES`.
- **Decision**: FIXED

### F5 — `mapOffer` silently remaps unknown license to `C`

- **Severity**: 💭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Data safety / Reliability
- **Location**: apps/baza-api/src/app/company/job-offer.service.ts:413-418
- **Detail**: Unknown/`null` `license_category` becomes `'C'`, which can hide a missing migration or bad data while still matching a C filter.
- **Fix**: Prefer log/fail on unexpected values after CHECK constraint is live; keep DEFAULT only at insert.
- **Decision**: FIXED — null/empty → C (legacy only); unexpected non-empty → log + 500

### F6 — Stale “optional until Phase 3” comment on required DTO field

- **Severity**: 💭 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: apps/baza-api/src/app/company/dto/job-offer.dto.ts:96-99
- **Detail**: Comment says optional; field is required `@IsIn` (correct end state).
- **Fix**: Delete or update the comment.
- **Decision**: FIXED — stale comment removed

## Triage summary

- Fixed: F1 (Fix A + debounce), F2, F3 (Fix A), F4, F5, F6
- Skipped: —
- Accepted: —
