# UX Improvements (S-06) — Plan Brief

> Full plan: `context/changes/ux-improvements/plan.md`
> Research: `context/changes/ux-improvements/research.md`

## What & Why

Polish empty, loading, and error UX on Job Offers browse and the company offer list so users can tell „nothing here” from „request failed” and recover with retry / clear-filters. FE-only; ships in parallel with S-05 without touching inbox or applications.

## Starting Point

Browse already has a full `@if` state chain and filtered-empty CTA; company list only has loading + empty and snackbar-on-load-failure. `@baza/ui` has shells only — no status primitive yet.

## Desired End State

Both pages show distinct loading / error / empty via a shared `baza-async-status` component. Errors offer „Spróbuj ponownie”. Mutations (unpublish) still use snackbars. No API or route changes.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Loading affordance | Text only (tighten copy) | Matches existing pages; avoid introducing spinners this slice | Plan |
| Company list load failure | Inline error + retry | Matches public-profile list-fetch pattern; empty ≠ error | Plan |
| Browse error retry | „Spróbuj ponownie” | Parity with other list surfaces when filters are already correct | Plan |
| Shared UI | New `@baza/ui` AsyncStatus | Explicitly chosen for DRY across the two S-06 pages | Plan |
| Routes / S-05 boundary | Do not edit `app.routes.ts`, inbox, applications | Parallel worktree merge safety | Research |

## Scope

**In scope:**
- `libs/baza/ui` AsyncStatus component + export
- `job-offers-page*` wiring (loading/error/empty + retry)
- `company-offers-list-page*` error signal + wiring
- Light unit tests where cheap

**Out of scope:**
- Inbox / applications / CV / schema
- `app.routes.ts`
- Spinners / skeletons
- Migrating other pages onto AsyncStatus
- API changes

## Architecture / Approach

Presentational `baza-async-status` (`kind` + `message` + projected CTA) in `@baza/ui`. Pages own Material buttons and fetch/retry logic. Browse keeps `switchMap` cancellation; company list adds an `error` signal and exclusive template branches.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Shared async-status | `@baza/ui` component + export | Over-designing the API |
| 2. Wire browse | Retry + shared states on Job Offers | Breaking filter `switchMap` on retry |
| 3. Wire company list | Inline error ≠ empty | Snackbar/unpublish regressions |

**Prerequisites:** Branch `feat/ux-improvements` from main; S-05 work stays in the other worktree  
**Estimated effort:** ~1 session across 3 short phases

## Open Risks & Assumptions

- Shared `@baza/ui` adds a small cross-cutting file surface vs S-05 — still safe if routes/inbox untouched
- Browse retry must not create a second racing HTTP subscription

## Success Criteria (Summary)

- User can distinguish empty vs error on both pages and recover via retry / clear filters
- Unpublish snackbars unchanged
- PR diff stays off inbox, applications, and `app.routes.ts`
