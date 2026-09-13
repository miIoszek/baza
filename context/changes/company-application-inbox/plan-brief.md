# Company Application Inbox (S-05) — Plan Brief

> Full plan: `context/changes/company-application-inbox/plan.md`  
> Research: `context/changes/company-application-inbox/research.md`

## What & Why

Close the marketplace loop (US-01 / FR-005): after a driver applies, the **owning company** sees the application in `/company/inbox` with email, phone, optional message, and can download the private PDF CV — and nobody else can.

## Starting Point

- Nest-only `job_applications` + private R2 CV keys from S-04; public apply works.
- No company list/get/CV endpoints; no R2 GetObject.
- FE `/company/inbox` is a gated placeholder; shell has no inbox nav link.
- Parallel S-06 owns browse + company-offer-list polish — stay off those surfaces.

## Desired End State

Logged-in company opens Skrzynka, sees applications (newest first) with contact + message + offer context, downloads CV via Nest after ownership check. Empty/loading/error states live on the **new inbox page**. Raw `cv_file_key` never reaches the browser.

## Key Decisions

| Decision | Choice | Why |
| -------- | ------ | --- |
| CV delivery | Nest stream proxy (`GET …/applications/:id/cv`) | Bucket stays fully private; no presigner dep |
| List shape | Flat company-wide, newest first | Enough for north star; include offer title |
| Detail page | None — list + per-row CV download | Matches FR-005 MVP |
| FE types | List DTO **without** `cvFileKey` / `hasCv` | Privacy; CV always present by schema |
| Schema | No migration | Index + Nest filter already enough |
| Statuses | Out of scope | PRD deferred |
| S-06 fence | New inbox files + shell link + routes swap only | Avoid merge fights |
| Ownership | Duplicate private `requireCompanyForUser` on JobApplicationService | `JobOfferService` helper is private — no cross-service call |

## Scope

**In:** shared list types; Nest list + CV download; R2 getObject; replace placeholder; shell nav; tests.

**Out:** application statuses; driver accounts; browse/offer-list UX (S-06); changing public apply; public CV URLs.

## Phases

| Phase | Delivers |
| ----- | -------- |
| 1 | Types + Nest list + CV stream + ownership tests |
| 2 | Inbox page + shell nav + FE wiring |

## Success Criteria

- Company A sees only own applications; company B / anon cannot list or download A’s CV
- CV downloads as PDF; not via `R2_PUBLIC_URL`
- Inbox reachable from shell; empty state when none
