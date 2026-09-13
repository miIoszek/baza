---
date: 2026-09-13T13:59:58+02:00
researcher: Auto
git_commit: fafa2dae15ab7145ab506c84e72301c018e7e540
branch: feat/ux-improvements
repository: baza-s06-ux
topic: "Empty/loading/error UX on Job Offers browse and company offer list (S-06)"
tags: [research, codebase, job-offers, company-offers-list, ux-polish, angular]
status: complete
last_updated: 2026-09-13
last_updated_by: Auto
---

# Research: Empty/loading/error UX on Job Offers browse and company offer list (S-06)

**Date**: 2026-09-13T13:59:58+02:00
**Researcher**: Auto
**Git Commit**: fafa2dae15ab7145ab506c84e72301c018e7e540
**Branch**: feat/ux-improvements
**Repository**: baza-s06-ux

## Research Question

What exists today for empty/loading/error states on Job Offers browse and the company offer list, what shared UI can be reused, and what must stay out of scope so this FE-only slice can ship in parallel with S-05 (inbox)?

## Summary

Both target surfaces already have basic text-based loading and empty copy. **Browse** also has inline fetch error and a filtered-empty CTA; **company offer list** surfaces load failures only via `MatSnackBar` and has no retry. `@baza/ui` has no status/empty/spinner primitives (only `PageShell` / `AppShell`). No `MatProgressSpinner` / skeletons anywhere in the FE. Best path: **page-local polish** (richer empty blocks, inline error + retry on company list, token-aligned error color, clearer loading), **do not** touch inbox/applications/`app.routes.ts` unless absolutely required.

## Detailed Findings

### Job Offers browse (`job-offers-page*`)

- Signals: `loading`, `error`, `geoError`, `offers`, `filters` + `hasFilters` ([job-offers-page.ts:139–153](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts#L139-L153)).
- Fetch pipeline: queryParamMap → debounce → `switchMap` GET `/api/offers`; errors set via `extractError` (joins Nest `message` arrays) ([job-offers-page.ts:176–203](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts#L176-L203), [271–282](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts#L271-L282)).
- Template state chain: loading → error → filtered empty (+ “Wyczyść filtry”) → unfiltered empty → list+map ([job-offers-page.html:67–81](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/pages/job-offers/job-offers-page.html#L67-L81)).
- Gaps vs “clearer”: plain “Ładowanie ofert…” paragraph; error is text-only (no retry CTA); filtered empty is already the richest pattern; error color hardcodes `#f87171` ([job-offers-page.scss:49–51](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/pages/job-offers/job-offers-page.scss#L49-L51)) vs `--mat-sys-error` used elsewhere.
- Specs cover filter helpers / empty-state CTA detection only — not template state rendering ([job-offers-page.spec.ts](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/pages/job-offers/job-offers-page.spec.ts)).

### Company offer list (`company-offers-list-page*`)

- Signals: `loading`, `offers` only — **no `error` signal** ([company-offers-list-page.ts:22–23](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.ts#L22-L23)).
- `reload()` catches errors with snackbar; list stays previous/`[]`; finally clears loading ([company-offers-list-page.ts:44–58](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.ts#L44-L58)).
- Template: loading paragraph → “Dodaj ofertę” + empty “Brak ofert. Utwórz pierwszą.” or list ([company-offers-list-page.html:18–31](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.html#L18-L31)).
- Gaps: load failure indistinguishable from empty after snack dismisses; no inline error/retry; empty CTA is weak (copy only — primary button already above); no dedicated list-page unit tests.

### Shared UI / patterns elsewhere

- `@baza/ui` exports only `PageShell` and `AppShell` — no spinner/empty/error ([libs/baza/ui/src/index.ts](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/libs/baza/ui/src/index.ts)).
- Closest peer pattern: public company profile offers section with inline error + “Spróbuj ponownie” ([company-public-profile.html:43–47](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/pages/companies/company-public-profile.html#L43-L47), [company-public-profile.ts:60](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/pages/companies/company-public-profile.ts#L60)).
- Mutation/auth errors stay on `MatSnackBar`; list fetch errors prefer inline — company list currently breaks that list-fetch convention.
- No `MatProgressSpinner` / `MatProgressBar` / skeleton usage in FE.

### Routes / parallel S-05 boundary

- Browse and company list routes already registered in [app.routes.ts](https://github.com/miIoszek/baza/blob/fafa2dae15ab7145ab506c84e72301c018e7e540/apps/baza-frontend/src/app/app.routes.ts) (`job-offers`, `company/offers`). Polish should **not** require route edits.
- Roadmap Stream C: S-06 ∥ S-05; keep out of inbox, application download, and schema (`context/foundation/roadmap.md` S-06 risk).
- Lesson constraint: do not touch inbox / applications schema / private CV; minimize `app.routes.ts` churn vs parallel inbox worktree.

## Code References

- `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.ts:139-203` — browse load/error state machine
- `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.html:67-81` — browse empty/loading/error UI
- `apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.ts:44-58` — snackbar-only load errors
- `apps/baza-frontend/src/app/pages/company/offers/company-offers-list-page.html:18-31` — company list loading/empty
- `apps/baza-frontend/src/app/pages/companies/company-public-profile.html:43-47` — inline error + retry reference
- `libs/baza/ui/src/index.ts` — no status primitives

## Architecture Insights

- Established pattern: page-local `@if (loading())` / `@else if (error)` / empty / content; snackbars for mutations.
- Prefer aligning company list with browse + public-profile **inline error + retry**, not inventing a shared `@baza/ui` component unless a third surface needs the same richer empty CTA block in this slice.
- Token inconsistency (`#f87171` vs `--mat-sys-error`) is a cheap polish win on browse.

## Historical Context (from prior changes)

- S-03 (`context/archive/2026-09-11-driver-browse-job-offers/`) shipped functional empty + clear-filters CTA and fixed Nest message joining / fetch races — left presentation “clearer” polish for later.
- S-02 (`context/archive/2026-09-10-publish-job-offer/`) introduced company offers list; public-profile offers error/empty indistinguishability was FIXED there — company **employer** list still snackbar-only.
- `context/foundation/lessons.md` — form validation FE/BE/DB only; not central to this slice.

## Related Research

- None under `context/changes/` (this is the first active research artifact for S-06).
- Archive plans: `context/archive/2026-09-11-driver-browse-job-offers/plan.md`, `context/archive/2026-09-10-publish-job-offer/plan.md`.

## Open Questions

- How “clearer” loading should look: keep text vs introduce Material spinner (new dependency pattern in this codebase).
- Whether browse error needs a retry CTA (filter refetch already re-runs on query change; retry could re-navigate or re-trigger last fetch).
- Whether to extract anything into `@baza/ui` in this slice or stay strictly page-local.
- Exact empty copy/CTA strength for company list when zero offers (primary “Dodaj ofertę” already present).
