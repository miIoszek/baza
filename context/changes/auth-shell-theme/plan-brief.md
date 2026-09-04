# Auth Shell Theme — Plan Brief

> Full plan: `context/changes/auth-shell-theme/plan.md`

## What & Why

Give Baza a dark Material 3 shell and auth-page chrome before wiring real auth. Companies need a recognizable navbar and register/login cards that match the agreed UX so later Supabase/Nest work drops into existing layouts.

## Starting Point

Frontend has Material installed with a light azure M3 theme, an unused `router-outlet`, and home content hardcoded in the root via `PageShell`. No AppShell, no `/login` or `/register`.

## Desired End State

Dark Grok-inspired theme; AppShell with `Baza` + Login; routes `/`, `/login`, `/register` with centered Material card stubs for login and company FR-001 register fields — no API calls.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Theme | Custom dark M3 (Grok), not azure | Locked product look for auth program | Umbrella map |
| Shell | Always-on navbar + outlet | JustJoin-like chrome without extra chrome | Umbrella map |
| Auth cards | Stub UI only this change | Split program; API in later changes | Umbrella map |
| Register fields | Company FR-001 labels | Screen was layout reference only | Umbrella map |
| AppShell location | `@baza/ui` | Shared UI lib already exists | Plan |

## Scope

**In scope:** theme, AppShell, home route move, login/register stubs

**Out of scope:** Supabase, Nest auth, R2, session navbar state

## Architecture / Approach

`styles.scss` → dark theme; `baza-app-shell` wraps routed pages; feature pages under `apps/baza-frontend/src/app/pages/`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Dark Grok theme | Global dark Material tokens | Palette fight with leftover `app.scss` |
| 2. AppShell + routes + home | Navbar + `/` | Spec breakage on DOM change |
| 3. Login/register stubs | Card UX | Over-building real validation early |

**Prerequisites:** Material already in package.json
**Estimated effort:** ~1 session, 3 phases

## Open Risks & Assumptions

- Manual verification may be skipped in agent runs when user asked to complete all todos; mark manual items with agent visual/build proxy where possible.
- Grok palette is approximate (no official Material palette export).

## Success Criteria (Summary)

- Dark shell loads without azure light theme
- Navbar always shows Baza + Login
- `/login` and `/register` cards match agreed stub UX
