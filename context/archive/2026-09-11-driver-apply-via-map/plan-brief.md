# Driver Apply via Map (S-04) — Plan Brief

> Full plan: `context/changes/driver-apply-via-map/plan.md`
> Research: `context/changes/driver-apply-via-map/research.md`

## What & Why

Drivers need offer detail with **route visualization** (base pin + arrowed country-to-country lines) and must **apply without an account** (email, phone, PDF CV, optional message, GDPR consent). This closes FR-008/FR-009 and feeds S-05 inbox via persisted private CV keys.

## Starting Point

Detail + public `GET /api/offers/:id` and browse Leaflet pins already ship. Apply types are stubs only. R2 is public-logo-only. Nest already blocks publish without company coordinates (`assertCanPublish`); FE messaging around that gate is weak.

## Desired End State

On `/job-offers/:id` the driver sees job info + map (pin + arrowed route lines) and submits apply successfully inline. Applications and private CV keys live in Nest-only storage for S-05. No company download in this change.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Map MVP | Pin **and** route lines | FR-008 requires route visualization beyond text | Research |
| Message field | Optional (≤2000) | Aligns FR-009 apply with FR-005 inbox later | Research |
| Field limits | email≤254, phone≤32, message≤2000; consent wire `'true'`/`'1'` | Lesson: FE+BE+DB validation | Plan review |
| CV in S-04 | Upload + private key only; **separate private R2 bucket** | Download belongs in S-05; public logo bucket must not serve CVs | Research + Plan review |
| Rate limit | Apply + register | Same public multipart spam vectors | Plan |
| CV format | PDF ≤ 5 MB | Lowest risk MIME/size for MVP | Plan |
| GDPR | Required consent checkbox | Traceable consent before PII land | Plan |
| Success UX | Inline on detail | No new route; simple loop | Plan |
| Arrows | `leaflet-polylinedecorator` | Matches PRD “lines/arrows” | Plan |
| Missing base | **Required** for publish — FE disables publish until profile coords loaded; BE `assertCanPublish` remains | Always pin on published offers | Plan review |
| Duplicates | Allowed | Drivers can resubmit corrected CV | Plan |
| Centroids | `GET /api/geo/countries` | FE must not hardcode geo | Plan |

## Scope

**In scope:** applications migration + public apply POST; private R2 CV; throttle apply+register; geo countries API; detail map pin+arrows; apply form + consent; publish-gate FE clarity.

**Out of scope:** company inbox/CV download; driver accounts; public CV URLs; DOCX; browse map redesign; clustering/chat/payments.

## Architecture / Approach

Shared-types → Nest-only `job_applications` + private R2 keys → public `POST /api/offers/:id/applications`. Detail loads centroids from Nest, draws Leaflet layers (pin + decorated polylines). Browse pin component stays pin-only. Company publish continues to require profile lat/lng on the API; FE surfaces the error.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Apply API + private CV | Persist apply + private objects + throttle | Public URL leak / R2 orphans |
| 2. Geo + detail map | Centroids API + pin + arrowed lines | Decorator dep / empty geometry UX |
| 3. Apply form + publish UX | Driver form + clear publish-without-coords | Weak FE validation vs lesson |

**Prerequisites:** R2 credentials for private puts; published offer with company coords for map smoke; Supabase migrations path.
**Estimated effort:** ~3 sessions across 3 phases (+ impl-review).

## Open Risks & Assumptions

- Private R2 path must not depend on `R2_PUBLIC_URL` the way logos do — **separate private bucket**
- Centroid accuracy is “good enough” for MVP arrows, not routing-quality
- Existing published offers without coords stay readable; re-publish still blocked by Nest

## Success Criteria (Summary)

- Driver completes browse → detail (map) → apply → inline success
- CV not publicly fetchable; row ready for S-05
- Publish without company coords fails with clear Polish FE guidance
