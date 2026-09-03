---
project: Baza
context_type: greenfield
created: 2026-09-03
updated: 2026-09-03
timeline_budget:
  mvp_weeks: 2
  hard_deadline: 2026-09-12
  after_hours_only: true
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: pain category
      decision: coordination overhead + missing capability (no route-based matching tool)
    - topic: primary persona scope
      decision: hiring decision-maker at a transport company (exact role TBD — recruiter / fleet manager / owner)
    - topic: driver role in marketplace
      decision: driver is the product — companies are the paying / primary side; drivers are supply
    - topic: core marketplace actions
      decision: companies create accounts and post jobs; drivers create profiles and apply (sign CV) to job offers
    - topic: auth strategy
      decision: login required for companies; MVP drivers apply without an account (driver accounts later)
    - topic: mvp payments
      decision: job offers free in MVP; payments and paid listings later
    - topic: mvp timeline
      decision: keep the full first-session flow; estimate 2 weeks after-hours; user accepted not scoping down
    - topic: product type
      decision: web-app (Angular + NestJS preference forwarded to tech-stack, not locked in PRD)
    - topic: target scale
      decision: medium (dozens to a hundred); at 100x map pins need stacking with popup list
    - topic: timeline framing
      decision: hard_deadline 2026-09-12; after_hours_only true
    - topic: non-goals
      decision: no payments; no driver accounts; no chat; no fleet/employee-count required polish; Polish-only; no pin clustering in MVP
  frs_drafted: 9
  quality_check_status: accepted
---

## Vision & Problem Statement

Transport companies cannot retain drivers because generic and legacy job boards do not match on the two things that predict whether a driver stays: route geography and how often they return home. A company posts, hires, and then the driver leaves when the routes or home cadence do not match what they expected.

Existing boards are mostly global, not sector-focused; sector boards that exist look legacy. A modern platform that lets a driver say they are willing to drive to the UK and come home for 2 days every 2 weeks — and then shows companies looking for that pattern — is the filter that keeps drivers. One driver the author knows often changes job place for this reason. At much larger offer density, map pins would need stacking with a popup list on click rather than one pin per company alone.

The platform includes company accounts (companies post jobs with location and routes) and driver accounts (profile, experience, qualifications, route preferences, home-return cadence, actively looking vs open to offers). Drivers apply to job offers by signing / submitting a CV. Job details include an interactive map with route visualization so drivers see not only working conditions but where they will actually drive.

## User & Persona

Hiring decision-maker at a transport company (recruiter, fleet manager, or owner — role varies by company size). They reach for the product when they need drivers who will stay, not just applicants. They create a company account, post job offers with location and the routes they operate, and receive applications from drivers whose preferences already fit those routes.

### Secondary persona

Professional driver. Creates a profile (experience, qualifications, route preferences, how often they want to return home, actively looking vs open to offers). Browses a job listing plus interactive map, sees route visualization in job details, and applies by signing / submitting a CV. Drivers are the supply side; the MVP is built so companies retain drivers, not so drivers are the paying customer.

## Access Control

Companies: login required. Company role can register, edit a public company profile, publish job offers, and see applications in an employer dashboard/inbox.

Drivers (MVP): no account required to apply. Apply with email, phone, and CV via a small form on the job offer.

Driver accounts and driver profiles (experience, qualifications, looking vs open to offers) are part of the product vision but not required to complete the MVP apply loop.

## Timeline acknowledgment

Acknowledged on 2026-09-03: 2-week MVP requires sustained dedication; user accepted. User kept the full first-session flow (did not scope down) and estimated 2 weeks of after-hours work.

## Success Criteria

### Primary

- A company can register, land on a public company profile, publish a job offer (title, countries/directions, home-return cadence, required experience, description, optional salary range) with base location shown as a map pin, and see that offer in Job Offers (list + map).
- A driver can filter Job Offers (e.g. routes to Italy + weekly return home), open an offer with job info on the left and route lines/arrows on the map on the right, apply without an account (email, phone, CV), and the company receives that application in their dashboard/inbox.

### Secondary

- None. Primary is enough for this MVP. (Deferred: company photos, employee-count range, fleet types/age, payments/paid listings, driver accounts.)

### Guardrails

- Job offers stay free in MVP — no payments or paid listings.
- A driver can apply without creating an account.
- Driver CV and contact details are only visible to the company they applied to.

## Functional Requirements

### Company account & profile

- FR-001: Company can sign up with company name, NIP, short description, optional photo, and base location. Priority: must-have
  > Socrates: Counter-argument considered: NIP or field count at sign-up could reduce completions. Resolution: kept as written.
- FR-002: Company can view and edit a public company profile after registration. Priority: must-have
  > Socrates: Counter-argument considered: public profile before offers looks empty; editing may be scope creep. Resolution: kept as written.

### Job offers

- FR-003: Company can create and publish a free job offer with title, countries/directions of routes, home-return cadence, required years of experience, required experience with a type of transport, description, and optional salary range. Priority: must-have
  > Socrates: Counter-argument considered: too many required fields or optional salary weakens matching. Resolution: kept as written.
- FR-004: Company can see published offers on their company profile and in Job Offers as a list and as a map pin at the company base location. Priority: must-have
  > Socrates: Counter-argument considered: base pin confuses with route; map pin could wait. Resolution: kept as written.
- FR-005: Company can see applications in an employer dashboard/inbox with driver contact information, message, and CV. Priority: must-have
  > Socrates: Counter-argument considered: inbox without statuses gets messy; CV storage is privacy risk. Resolution: kept as written.

### Driver browse & apply

- FR-006: Driver can open Job Offers without creating an account. Priority: must-have
  > Socrates: Counter-argument considered: no accounts weakens retention and invites spam. Resolution: kept as written.
- FR-007: Driver can filter Job Offers by route countries/directions and home-return cadence. Priority: must-have
  > Socrates: Counter-argument considered: empty filter results on a cold marketplace; free-text search might suffice. Resolution: kept as written.
- FR-008: Driver can open a job offer and see job information plus a map with route lines/arrows for the countries and directions covered. Priority: must-have
  > Socrates: Counter-argument considered: country-level lines may be inaccurate; pin + country list enough for MVP. Resolution: kept as written.
- FR-009: Driver can apply to a job offer without an account by submitting email, phone, and CV. Priority: must-have
  > Socrates: Counter-argument considered: CV upload is heavy; driver cannot track applications without account. Resolution: kept as written.
## User Stories

### US-01: Company publishes an offer and a driver applies via map + filters

- **Given** a transport company has registered with a base location and published a job offer covering Italy routes with weekly return home
- **When** a driver opens Job Offers, filters for Italy routes and weekly return home, opens that offer, and submits an application with email, phone, and CV (no account)
- **Then** the driver sees the offer details with route visualization on the map, and the company receives the application in their employer dashboard/inbox

#### Acceptance Criteria
- Company registration requires company name, NIP, description, and base location; photo is optional
- Published offer appears in Job Offers list and as a map pin at the company base
- Filters for route direction and home-return cadence return matching offers
- Job detail shows job info and route lines/arrows on the map
- Application works without a driver account
- Only the company that received the application can see that driver's CV and contact details
- Job offers remain free (no payment step)

## Business Logic

The product matches and presents job offers primarily based on route compatibility (origin–destination countries) and the driver’s preferred frequency of returning home; instead of a text-only list, it visually shows the routes each company operates on a map.

Matching inputs from the company side are the countries covered by the routes (e.g. Poland → Italy), return-home frequency stated on the offer, and driver requirements. From the driver side, inputs are preferred countries/routes, preferred return-home frequency, and (when available) license category and similar preferences — in MVP these are set as Job Offers filters rather than a saved driver profile.

The driver receives a list of matching job offers, also shown on a map; opening an offer shows job details plus a visual of the company’s routes. This happens on Job Offers: set filters (e.g. Italy + weekly return home), see matches in list and map, open an offer, then apply.

## Non-Functional Requirements

- Job list and map appear without noticeable delay under normal use; filtering feels fast and responsive.
- Comfortable primarily on phones; also usable on tablet and desktop.
- Usable on current major versions of Chrome, Firefox, Safari, and Edge.
- Driver CVs and contact details are visible only to the employer they applied to; a user with an account can delete that account and associated personal data.
- Personal data, CVs, and consent handling meet GDPR requirements.
- Under normal usage, browsing offers and applying does not fail due to frequent errors or prolonged unavailability.
- MVP UI language is Polish; additional languages can be added later without redesigning the product for one language only.
- On large screens, map and route visualization are clear; on smaller screens, the job list is shown instead of the map. If the driver shares location, offers are ordered nearest-first by distance from the driver.

## Forward: tech-stack

User preference (not a PRD commitment): web frontend with Angular; backend with NestJS. Pick up in the tech-stack-selection step after `/10x-prd`.

## Non-Goals

- No payments or paid listings in MVP — job offers stay free; monetization later.
- No driver accounts or saved driver profiles in MVP — apply without signup; profiles later.
- No chat/messaging between company and driver beyond the apply form.
- No required fleet details, employee-count range, or company-photo polish — optional photo only; those fields stay out of MVP scope as requirements.
- No multi-language UI in MVP — Polish only; more languages later.
- No map pin stacking / cluster popup list in MVP — only needed when many companies overlap at larger scale.

## Quality cross-check

All six greenfield checklist elements present. Quality status: accepted.

Non-blocking note (for awareness in planning): hard deadline 2026-09-12 is tighter than the stated 2-week after-hours estimate (~9 calendar days remaining at shape completion).
