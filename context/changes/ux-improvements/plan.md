# UX Improvements (S-06) Implementation Plan

## Overview

Clearer empty, loading, and error states on Job Offers browse and the company offer list via a small shared `baza-async-status` component in `@baza/ui`, wired into both pages without touching APIs, inbox, or `app.routes.ts`.

## Current State Analysis

- **Browse** (`job-offers-page*`): full state chain already exists (loading → error → filtered empty + clear CTA → empty → list). Loading is a plain paragraph; error has no retry; error color hardcodes `#f87171`.
- **Company list** (`company-offers-list-page*`): loading + empty/list only. Load failures go to `MatSnackBar` with no `error` signal — after dismiss, failure looks like empty.
- **`@baza/ui`**: only `PageShell` / `AppShell`; no status primitives. Frontend already depends on the lib (`AppShell` in `app.ts`).
- **Peer pattern**: public company profile offers uses inline error + „Spróbuj ponownie” (`company-public-profile.html`).

## Desired End State

Drivers on `/job-offers` and employers on `/company/offers` always see a distinct, readable loading / error / empty presentation. Errors offer „Spróbuj ponownie”. Empty states keep helpful Polish copy and CTAs. Both pages consume one shared `@baza/ui` async-status component. Unpublish (and other mutations) still use snackbars. No route or API changes.

### Key Discoveries:

- Browse already has the richest empty CTA; company list needs inline error/retry to match list-fetch convention (`company-public-profile.html:43-47`).
- No spinner/skeleton pattern exists — keep text loading (decision 1A).
- Routes for both pages already exist in `app.routes.ts` — leave that file untouched for S-05 parallel safety.
- Shared component was explicitly chosen (decision 4B) despite research leaning page-local — keep the API minimal so merge surface stays small.

## What We're NOT Doing

- Inbox, applications schema, CV download, or any S-05 files
- API / Nest / Supabase migrations
- Edits to `app.routes.ts`
- MatProgressSpinner / skeletons
- Migrating public profile / offer detail / other pages onto the new component (optional follow-up)
- Changing marketplace filters, offer CRUD, or unpublish snackbar behavior
- Backend error-message contract changes

## Implementation Approach

1. Add a standalone `AsyncStatus` component under `libs/baza/ui` with a small `kind` / message / optional action API and content projection for the action button.
2. Export it from `@baza/ui` and use it on browse + company list for loading, error, and empty blocks.
3. On company list: introduce `error` signal; on failed GET show inline status + retry calling `reload()`; clear error on successful load; keep snackbar for unpublish only.
4. On browse: wrap existing loading/error/empty branches; add `retryLoad()` that bumps `reloadTick` into the same `queryParamMap` + `switchMap` pipeline (no parallel HTTP subscription).
5. Align error color to `var(--mat-sys-error)`.

## Critical Implementation Details

**Browse retry:** Use a `reloadTick` signal/subject combined with `queryParamMap` (e.g. `combineLatest` or equivalent) feeding the existing `debounceTime` → `switchMap` → GET pipeline. `retryLoad()` only bumps `reloadTick` — never subscribe to a second `http.get` outside that pipe. Keep `switchMap` so in-flight filter/retry requests still cancel.

**Company list empty vs error:** On GET failure set `error` and do **not** call `offers.set(...)` (leave prior value). Template uses an exclusive `@if` chain (loading → error → empty → list) so a failed first load (`offers = []`) never renders as „Brak ofert”, and a mid-session failure hides the stale list behind the error branch. Successful reload clears `error` and replaces `offers`. Match public-profile retry shape (`retry*` → shared load), not its `offers.set([])` on error.

**Shared component Material dependency:** Prefer the action as projected content (`ng-content`) so `@baza/ui` does not need to import `MatButtonModule` — pages keep owning Material buttons. Loading/error/empty are semantic wrappers + CSS tokens only.

## Phase 1: Shared async-status in `@baza/ui`

### Overview

Introduce `baza-async-status` and export it from the UI library so both pages can share one loading/error/empty presentation.

### Changes Required:

#### 1. AsyncStatus component

**File**: `libs/baza/ui/src/lib/async-status/async-status.ts` (+ `.html`, `.scss`)

**Intent**: Standalone presentational component for async list/page status blocks.

**Contract**:
- Selector: `baza-async-status`
- Inputs: `kind: 'loading' | 'error' | 'empty'` (required); `message: string` (required)
- Optional projected content for CTA(s) (retry / clear filters / add offer)
- Host classes by kind for styling; error text uses `var(--mat-sys-error)`; loading/empty use muted on-surface variant
- No HTTP, no Material imports inside the lib component

#### 2. Public export

**File**: `libs/baza/ui/src/index.ts`

**Intent**: Re-export `AsyncStatus` alongside `PageShell` / `AppShell`.

**Contract**: `export { AsyncStatus } from './lib/async-status/async-status';`

### Success Criteria:

#### Automated Verification:

- `npx nx lint ui` passes
- `npx nx build ui` passes (or frontend build resolves the new export)

#### Manual Verification:

- Component API is usable from a page template with projected button (eyeball in Phase 2)

**Implementation Note**: After completing this phase and automated verification passes, pause for manual confirmation before Phase 2.

---

## Phase 2: Wire Job Offers browse

### Overview

Replace ad-hoc status paragraphs on browse with `baza-async-status`, add error retry, tighten loading/empty copy layout, fix error token color.

### Changes Required:

#### 1. Browse page TS

**File**: `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts`

**Intent**: Support explicit retry of the current filter query without breaking `switchMap` cancellation; import `AsyncStatus`.

**Contract**: Expose `retryLoad()` that bumps `reloadTick` only. The `ngOnInit` load pipeline must combine `queryParamMap` with `reloadTick` so both filter changes and retries share one `switchMap` subscription. Preserve existing geoError handling outside the shared component (geo is not a list-fetch state).

#### 2. Browse page template + styles

**Files**: `job-offers-page.html`, `job-offers-page.scss`

**Intent**: Use `baza-async-status` for loading, error (+ retry button), filtered empty (+ clear filters), and unfiltered empty. Drop hardcoded `#f87171` in favor of component tokens / `--mat-sys-error`.

**Contract**: State order unchanged: loading → error → filtered empty → empty → list. Polish copy may be tightened but meaning preserved (e.g. „Ładowanie ofert…”, filtered empty hint, „Brak opublikowanych ofert.”).

#### 3. Browse unit tests

**File**: `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.spec.ts`

**Intent**: Cover retry helper / `hasActiveJobOfferFilters` regressions; add a focused test if retry logic is pure-extractable; otherwise keep existing helper tests green.

**Contract**: Existing helper tests still pass; any new pure helper for reload params is unit-tested.

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-frontend --include=src/app/pages/job-offers/job-offers-page.spec.ts` passes
- `npx nx lint baza-frontend` passes (or project lint for touched files)

#### Manual Verification:

- Force API failure (stop API or block `/api/offers`): error + „Spróbuj ponownie” recovers when API is back
- Zero matches with filters: empty + „Wyczyść filtry” restores list
- Unfiltered empty marketplace: empty message, no false error
- Loading text visible briefly on filter change

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Wire company offer list

### Overview

Add inline load error + retry and route empty/loading through the shared component; keep mutation snackbars.

### Changes Required:

#### 1. Company list TS

**File**: `apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.ts`

**Intent**: Add `error` signal; on GET failure set error without mutating `offers`; `retry` / `reload` clears error on success; unpublish errors remain snackbar-only.

**Contract**: Template exclusive chain: loading → error → empty → list. Successful reload clears `error` and sets `offers`. Load-path catch must not open MatSnackBar.

#### 2. Company list template + styles

**Files**: `company-offers-list-page.html`, `company-offers-list-page.scss`

**Intent**: Use `baza-async-status` for loading, error (+ „Spróbuj ponownie”), and empty (copy may point at creating the first offer; primary „Dodaj ofertę” can stay above or be projected).

**Contract**: Exclusive `@if` chain. „Dodaj ofertę” remains reachable in empty and success states (not only during loading).

#### 3. Optional smoke test

**File**: new or existing `company-offers-list-page.spec.ts` (create if cheap)

**Intent**: If TestBed cost is low, assert error signal set on failed GET; otherwise rely on manual verification — do not block the slice on heavy harness work.

**Contract**: Prefer at least one lightweight test if HttpClientTestingModule pattern already used nearby; skip if disproportionate.

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-frontend` passes (or targeted specs for touched pages)
- `npx nx lint baza-frontend` passes
- `npm run build` (or `npx nx build baza-frontend`) succeeds with the new `@baza/ui` export

#### Manual Verification:

- Logged-in company with zero offers: empty state, not error; „Dodaj ofertę” works
- Simulate GET failure: inline error + retry recovers; does not look like „Brak ofert”
- Unpublish still shows snackbar on success/failure

**Implementation Note**: After Phase 3 automated + manual checks, slice is ready for PR on `feat/ux-improvements`.

---

## Testing Strategy

### Unit Tests:

- Existing `job-offers-page.spec.ts` helpers remain green
- New/adjusted tests for browse retry helper if extracted
- Optional company-list error-on-failed-GET test

### Integration Tests:

- None required for this FE-only polish (no new E2E phase)

### Manual Testing Steps:

1. Browse happy path + filter empty + clear filters
2. Browse with API down → error → retry after API up
3. Company list empty vs error vs populated
4. Company unpublish snackbar unchanged
5. Confirm `app.routes.ts` and inbox/application files are untouched in the PR diff

## Performance Considerations

No new polling or heavier assets; text-only loading. Shared component is presentational — negligible cost.

## Migration Notes

None — pure FE presentation.

## References

- Research: `context/changes/ux-improvements/research.md`
- Roadmap S-06: `context/foundation/roadmap.md`
- Peer retry UI: `apps/baza-frontend/src/app/pages/companies/company-public-profile.html`
- Browse state machine: `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts`
- Company list: `apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Shared async-status in `@baza/ui`

#### Automated

- [x] 1.1 `npx nx lint ui` passes — a7b885d
- [x] 1.2 `npx nx build ui` passes (or frontend build resolves the new export) — a7b885d

#### Manual

- [x] 1.3 Component API is usable from a page template with projected button (eyeball in Phase 2) — a7b885d

### Phase 2: Wire Job Offers browse

#### Automated

- [x] 2.1 `npx nx test baza-frontend --include=src/app/pages/job-offers/job-offers-page.spec.ts` passes — ada9a93
- [x] 2.2 `npx nx lint baza-frontend` passes (or project lint for touched files) — ada9a93

#### Manual

- [x] 2.3 Force API failure: error + „Spróbuj ponownie” recovers when API is back — ada9a93
- [x] 2.4 Zero matches with filters: empty + „Wyczyść filtry” restores list — ada9a93
- [x] 2.5 Unfiltered empty marketplace: empty message, no false error — ada9a93
- [x] 2.6 Loading text visible briefly on filter change — ada9a93

### Phase 3: Wire company offer list

#### Automated

- [x] 3.1 `npx nx test baza-frontend` passes (or targeted specs for touched pages) — 409758b
- [x] 3.2 `npx nx lint baza-frontend` passes — 409758b
- [x] 3.3 `npm run build` (or `npx nx build baza-frontend`) succeeds with the new `@baza/ui` export — 409758b

#### Manual

- [x] 3.4 Logged-in company with zero offers: empty state, not error; „Dodaj ofertę” works — 409758b
- [x] 3.5 Simulate GET failure: inline error + retry recovers; does not look like „Brak ofert” — 409758b
- [x] 3.6 Unpublish still shows snackbar on success/failure — 409758b
