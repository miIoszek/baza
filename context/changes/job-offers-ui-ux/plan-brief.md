# Job Offers list + detail UI/UX — Plan Brief

> Full plan: `context/changes/job-offers-ui-ux/plan.md`
> Frame brief: `context/changes/job-offers-ui-ux/frame.md`

## What & Why

Drivers need a scannable marketplace entry and a clear path to apply. Browse/detail layouts and missing company identity on cards block that; weak A/B map and `/` = health demo make the product feel unfinished.

## Starting Point

S-06 async-status is on browse. List still lacks company branding in the API; filters sit above list|map; detail stacks info/apply; route map is thin amber without A/B pins; home is a health smoke page.

## Desired End State

`/` is offers (50/50 filters+list | map), cards are clickable with logo/name + pills, detail is two columns with scroll-to-apply, map shows theme-token A/B + dashed line, health page lives at `/health`.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Scope | Full punch list from user + frame | User required plan to cover everything described | Frame / Plan |
| Branch | Continue `feat/ux-improvements` | Single PR with S-06 (1B) | Plan |
| Logo size | `s48` (+ fallbacks) | List density | Plan |
| Company click | Logo/name → profile; card → detail | Keep company access without action buttons | Plan |
| Map A/B | Theme tokens + markers + dashed line | Fit Baza palette; theme-change reminder in `_theme.scss` | Plan |
| Old home path | `/health` | Matches API vocabulary (not `/doctor`) | Frame |
| Nest selects | Shared fragment on all mapOffer paths | Avoid empty branding on owner endpoints | Plan review |
| Card interaction | Host → detail; inner company `<a>` | Locks a11y vs nested wrapping `<a>` | Plan review |
| job-offers redirect | Relative `redirectTo: ''` | Preserves filter query params | Plan review |

## Scope

**In scope:** API `companyName`/`companyPhotoUrls`; browse layout/cards/pills/label; detail layout + Aplikuj CTA; detail map A/B tokens; `/` + `/health` + redirect.

**Out of scope:** Inbox/CV; browse map routes; street routing; unrelated dashboard polish.

## Architecture / Approach

Enrich Nest `mapOffer` join → FE browse/detail consume fields → theme CSS vars for Leaflet colors resolved at runtime → route table swap with redirects preserving `/job-offers/:id`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. API branding | Name + photos on JobOffer | Missed select paths |
| 2. Browse UI | 50/50 + cards/pills | Nested link a11y |
| 3. Detail UI | 2-col + scroll apply | Mobile stack |
| 4. Map A/B | Tokens + markers | Leaflet vs CSS vars |
| 5. Home = offers | `/` + `/health` | Broken bookmarks/tests |

**Prerequisites:** Frame approved; work on `feat/ux-improvements`  
**Estimated effort:** ~1–2 sessions across 5 phases

## Open Risks & Assumptions

- Combining with S-06 grows PR #11 — acceptable per 1B
- Centroids remain approximate for A/B (product-acceptable for MVP)

## Success Criteria (Summary)

- User can scan branded cards on `/`, open detail, jump to apply, see clear A→B on map
- `/health` preserves smoke page; deep links to offers still work
