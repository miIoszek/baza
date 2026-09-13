<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: UX Improvements (S-06)

- **Plan**: `context/changes/ux-improvements/plan.md`
- **Scope**: Phases 1–3 of 3 (commits `a7b885d`, `ada9a93`, `409758b`, `0f75dd4`, `190957e`)
- **Date**: 2026-09-13
- **Verdict**: APPROVED
- **Findings**: 0 critical / 3 warnings / 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Drift checklist (plan contracts)

### Phase 1 — `baza-async-status`

| Item | Verdict | Evidence |
|------|---------|----------|
| `kind: loading\|error\|empty`, `message`, ng-content, no MatButton in lib | **MATCH** | `async-status.ts:7-21` (`imports: []`); `async-status.html:1-5` (`ng-content`); host kind classes `async-status.ts:12-16` |
| Error color `--mat-sys-error` | **MATCH** | `async-status.scss:13-14` |
| Export from `index.ts` | **MATCH** | `index.ts:3` |
| Also export `AsyncStatusKind` type | **EXTRA** | `index.ts:4` (benign) |
| Drop `@angular/common` peer in `libs/baza/ui/package.json` | **EXTRA** | commit `a7b885d` (lint support) |

### Phase 2 — job-offers-page

| Item | Verdict | Evidence |
|------|---------|----------|
| `reloadTick` + `combineLatest` with `queryParamMap` → `switchMap` | **MATCH** | `job-offers-page.ts:157-186` |
| `retryLoad()` bumps tick only | **MATCH** | `job-offers-page.ts:195-197` |
| Single HTTP path (no second subscription) | **MATCH** | one `.subscribe` at `job-offers-page.ts:189`; `http.get` only inside `switchMap` |
| `baza-async-status` loading/error/empty | **MATCH** | `job-offers-page.html:80-98` |
| State order loading → error → filtered empty → empty → list | **MATCH** | `job-offers-page.html:80-175` |
| No `#f87171`; use `--mat-sys-error` | **MATCH** | no `#f87171` in page/lib SCSS; geo error `job-offers-page.scss:50-51`; component `async-status.scss:13-14` |
| Geo error stays outside shared component | **MATCH** | `job-offers-page.html:72-73` |

### Phase 3 — company-offers-list

| Item | Verdict | Evidence |
|------|---------|----------|
| `error` signal; GET fail does not mutate `offers` | **MATCH** | `company-offers-list-page.ts:30`, `67-68` (catch only `error.set`) |
| Exclusive loading → error → empty → list | **MATCH** | `company-offers-list-page.html:18-72` (Dodaj above empty/list per plan allow) |
| No snackbar on load fail; unpublish snackbar stays | **MATCH** | load catch has no snackBar; unpublish `49`, `52` |
| `baza-async-status` for loading/error/empty | **MATCH** | `company-offers-list-page.html:20-44` |
| Optional error-on-GET spec | **MATCH** | `company-offers-list-page.spec.ts:23-43` |
| `extractError` polish also applied to browse in p3 | **EXTRA** | `409758b` touches `job-offers-page.ts:296-321` (aligned polish, not phase-3 file list) |

### NOT doing

| Item | Verdict | Evidence |
|------|---------|----------|
| `app.routes.ts` | **MATCH** (untouched) | `git show a7b885d ada9a93 409758b --name-only` — no `app.routes.ts`; also absent from `0f75dd4` / `190957e` |
| inbox / S-05 / API / MatProgressSpinner | **MATCH** | none in ux-improvements commit file lists |

### Branch/PR vs `main` (out of plan scope)

| Item | Verdict | Note |
|------|---------|------|
| `job-offers-ui-ux` commits | **EXTRA** | visible on `main..HEAD` (maps, browse/detail polish, home route, etc.) — do not judge against this plan |
| `browser-favicon` commits | **EXTRA** | favicon + `index.html` title on branch — do not judge against this plan |
| `app.routes.ts` on branch | **EXTRA** (other change) | changed by job-offers-ui-ux (home route), **not** by ux-improvements commits |

## Findings

### F1 — Branch/PR includes other archived changes vs main

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: N/A (`git log main..HEAD` / `git diff --name-only main...HEAD`)
- **Detail**: Against `main`, the branch also contains `job-offers-ui-ux` and `browser-favicon` (plus archives). Those are outside the ux-improvements plan. Within commits `a7b885d..190957e`, scope matches the plan (plus benign chore/docs). A PR from this branch to `main` would mix changes unless the PR base/range is narrowed.
- **Fix**: Open/review the PR scoped to the five ux-improvements commits (or rebase onto a branch that already has the other work merged) so reviewers do not attribute EXTRA files to S-06.
- **Decision**: ACCEPTED — keep single PR #11 with stacked archived changes

### F2 — Benign EXTRAs inside ux-improvements commits

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `libs/baza/ui/src/index.ts:4`; `libs/baza/ui/package.json` (`a7b885d`); `job-offers-page.ts:296-321` (`409758b`); `context/foundation/roadmap.md` (`190957e`)
- **Detail**: Type re-export, peer-dep cleanup for lint, browse `extractError` network-noise mapping mirrored in p3, and roadmap S-06 in-progress stamp. None contradict plan contracts.
- **Fix**: No code change required; optional plan addendum if you want the checklist to list the type export / peer cleanup.
- **Decision**: SKIPPED

### F3 — Manual Progress items marked done with commit SHAs only

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `plan.md` Progress § Phase 2/3 Manual
- **Detail**: Manual browser checks (API-down retry, empty vs error, unpublish snackbar) are `[x]` with phase commit SHAs. This review did not re-run those UIs; automated `nx lint ui` and `nx test baza-frontend` (47 tests) passed in this review.
- **Fix**: No action if manual QA was done at those commits; otherwise spot-check the four Manual bullets before merge.
- **Decision**: DISMISSED — manual QA already done at phase commits

### F4 — `ng-content` suppressed for `kind === 'loading'`

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: `libs/baza/ui/src/lib/async-status/async-status.html:2-5`
- **Detail**: Plan allows optional projected CTAs; implementation hides the actions slot while loading. Call sites do not project into loading, so behavior matches intent.
- **Fix**: None.
- **Decision**: SKIPPED

### F5 — AsyncStatus missing live-region / a11y semantics

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `libs/baza/ui/src/lib/async-status/async-status.ts` / `.html`
- **Detail**: Shared status primitive has no `role` / `aria-live`. Errors won’t announce to screen readers; loading/empty likewise silent.
- **Fix A ⭐ Recommended**: Set host `role="status"` for loading/empty and `role="alert"` (or `aria-live="assertive"`) for error.
- **Fix B**: Accept risk for MVP polish slice; track a11y follow-up.
- **Decision**: FIXED via Fix A — role=alert/status + aria-live on host

### F6 — Company list retry can overlap without cancellation

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `company-offers-list-page.ts:37-71`
- **Detail**: `retryLoad` → `reload` has no in-flight guard. Double-click retry can race `loading`/`error`/`offers`. Browse uses `switchMap`; this page does not.
- **Fix A ⭐ Recommended**: Ignore re-entry while `loading()` is true (or bump a generation counter and ignore stale results).
- **Fix B**: Accept risk — rare double-click; leave as-is.
- **Decision**: FIXED via Fix A — retryLoad no-ops while loading()

### F7 — Spec doesn’t assert snackbar absent on GET fail

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `company-offers-list-page.spec.ts:23-43`
- **Detail**: Error-signal path tested; “no MatSnackBar on GET fail” not asserted.
- **Fix**: Optional — spy snackBar and expect not called on GET fail.
- **Decision**: FIXED — spy snackBar.open; expect not called on GET fail
