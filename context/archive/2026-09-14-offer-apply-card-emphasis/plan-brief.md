# Emphasize the apply card — Plan Brief

> Full plan: `context/changes/offer-apply-card-emphasis/plan.md`

## What & Why

The apply card on job-offer detail blends into the details card. Drivers should instantly see where to apply — glass + primary gradient, stronger border/glow, premium CTA — without SaaS-landing circus.

## Starting Point

Plain `#offer-apply` mat-card sharing `offer-detail__card` look. Global `.baza-glass-card` / `.baza-btn-premium` already power auth forms. Prior UI draft was lost on branch switch.

## Desired End State

Apply card is the clear action surface: gradient fill, primary outline + soft glow, icons on email/phone, CV dropzone with filename, full-width premium submit, premium “Aplikuj teraz”, green success tint. No left bar, no animation, no perk pills.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Visual language | Glass + primary gradient/border/glow | Matches existing premium tokens; enough contrast | Plan (from chat) |
| Circus chrome | Out | Felt like landing-page noise for drivers | Chat |
| Left accent bar | Out | User rejected | Chat |
| CTA | `baza-btn-premium` (submit + scroll) | Same CTA language as auth | Chat |
| Scope | Apply card only | Details card / layout stay | Plan |
| Complexity | LOW, skip deep Qs | FE polish, decisions already settled | User |

## Scope

**In scope:** `job-offer-detail-page.{html,scss,ts}` — visual emphasis + CV filename + icons/premium buttons.

**Out of scope:** Animated borders, left bar, perks, sticky apply, API/validation, restyling details card.

## Architecture / Approach

Reuse global glass/premium classes; page SCSS for gradient/outline/glow and CV dropzone; tiny TS signal for filename. New branch from `main`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Apply card visual emphasis | Distinct apply surface + tests green | Over-styling creeps back in |

**Prerequisites:** Branch from `main` (not employer-directory branch).
**Estimated effort:** ~1 session, one phase.

## Open Risks & Assumptions

- Soft glow may look strong on some displays — tune if user says still wrong.
- Existing apply specs must stay green; no validation changes.

## Success Criteria (Summary)

- Apply card is obviously the CTA block vs details card.
- Agreed “no circus” constraints hold.
- Apply flow (consent, CV, submit, success) unchanged and verified.
