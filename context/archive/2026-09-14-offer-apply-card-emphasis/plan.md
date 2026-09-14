# Emphasize the apply card on job offer detail Implementation Plan

## Overview

Make the apply card on job-offer detail visually distinct from the offer details card — glass + primary gradient, stronger border/glow, premium CTA — without over-the-top chrome (no spinning border, left accent bar, or perk pills).

## Current State Analysis

`JobOfferDetailPage` (`apps/baza-frontend/src/app/pages/job-offers/job-offer-detail-page.{html,ts,scss}`) renders `#offer-apply` as a plain `mat-card` with class `offer-detail__card offer-detail__apply` — same visual weight as the offer details card above it. Form fields have no prefix icons; CV upload is a bare file input; submit uses `mat-flat-button color="primary"` (not `baza-btn-premium`).

Global premium tokens already exist in `apps/baza-frontend/src/styles.scss` (`.baza-glass-card`, `.baza-btn-premium`) and are used on auth/company forms.

Working UI from an earlier session was lost on branch checkout; this plan re-implements from agreed decisions.

### Key Discoveries:

- Glass/premium patterns: `styles.scss` `.baza-glass-card` / `.baza-btn-premium`
- Apply form + tests: `job-offer-detail-page.ts` / `job-offer-detail-page.spec.ts`
- Theme tokens: `styles/_theme.scss` (`--mat-sys-primary`, `--baza-button-glow`, etc.)

## Desired End State

On `/job-offers/:id`, the apply card is immediately recognizable as the primary action surface: glass card, primary-tinted gradient fill, stronger primary outline + soft static glow, clearer title hierarchy, mail/phone icons, CV dropzone showing selected filename, full-width premium submit. Header “Aplikuj teraz” uses the same premium button. Success state uses a green-tinted variant of the same treatment. No left strip, no animated border, no perk chips.

## What We're NOT Doing

- Animating / spinning gradient borders
- Left accent bar
- Perk pills, badge icons, “Następny krok” kicker
- Sticky/sidebar apply layout or map-pane changes
- API, DTO, or validation rule changes
- Restyling the offer-details card

## Implementation Approach

One FE phase on a new branch from `main` (not on `cursor/employer-directory-grid-b39b`). Restyle `#offer-apply` with existing global classes + page SCSS; small TS/HTML for `cvFileName` and icons.

## Phase 1: Apply card visual emphasis

### Overview

Land the agreed apply-card treatment and keep the existing apply form behavior/tests green.

### Changes Required:

#### 1. Apply card markup

**File**: `apps/baza-frontend/src/app/pages/job-offers/job-offer-detail-page.html`

**Intent**: Structure the apply card so styling and CTA hierarchy match auth-style premium surfaces.

**Contract**: `#offer-apply` uses `baza-glass-card` + `offer-detail__apply` (+ `--success` when `applySuccess()`). Custom head (title + lead) instead of plain `mat-card-header` if needed for hierarchy. Mail/call `mat-icon matPrefix` on email/phone. CV label shows selected filename / hint. Submit and header “Aplikuj teraz” use `baza-btn-premium` (submit `full-width`).

#### 2. Apply card styles

**File**: `apps/baza-frontend/src/app/pages/job-offers/job-offer-detail-page.scss`

**Intent**: Visually separate apply from offer details without circus chrome.

**Contract**: Primary-tinted radial + linear gradient background; stronger primary outline (~1.5px); soft static glow (no animation); `align-self: start`; success variant swaps to secondary/green tint. CV dropzone: dashed box, filled/error states, no hover glow bloom. No left accent stripe. Respect `prefers-reduced-motion` only if any motion remains (prefer none).

#### 3. CV filename signal

**File**: `apps/baza-frontend/src/app/pages/job-offers/job-offer-detail-page.ts`

**Intent**: Show which CV was chosen without changing upload validation.

**Contract**: `cvFileName` signal set in `onCvSelected`, cleared on successful apply. Import `MatIconModule`. Apply form/API behavior unchanged.

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-frontend` passes (existing apply form specs still green)
- `npx nx lint baza-frontend` passes

#### Manual Verification:

- On offer detail, apply card reads clearly stronger than the details card (gradient + border + glow)
- No left accent bar; no spinning border; no perk pills
- CV selection shows filename; submit + “Aplikuj teraz” use premium button styling
- Success state is green-tinted and readable
- Mobile width looks fine (no overflow)

**Implementation Note**: After automated verification, pause for manual UI confirmation before closing the phase.

---

## Testing Strategy

### Unit Tests:

- Existing `job-offer-detail-page.spec.ts` apply tests remain the regression gate (consent + multipart post). No new unit tests required unless `cvFileName` wiring breaks those paths.

### Manual Testing Steps:

1. Open a published offer with map; scroll to apply — card stands out vs details card.
2. Select a PDF — filename appears; change file — name updates.
3. Submit valid application — success state green tint.
4. Check mobile (~390px) — no horizontal overflow, CTA usable.

## References

- Theme / glass: `apps/baza-frontend/src/styles.scss`, `apps/baza-frontend/src/styles/_theme.scss`
- Page: `apps/baza-frontend/src/app/pages/job-offers/job-offer-detail-page.{html,ts,scss}`
- Lessons: `context/foundation/lessons.md` (no form-validation changes in this change)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Apply card visual emphasis

#### Automated

- [x] 1.1 `npx nx test baza-frontend` passes — 3c9c724
- [x] 1.2 `npx nx lint baza-frontend` passes — 3c9c724

#### Manual

- [x] 1.3 Apply card clearly stronger than details card (gradient + border + glow) — 3c9c724
- [x] 1.4 No left bar / spinning border / perk pills — 3c9c724
- [x] 1.5 CV filename + premium CTAs work; success tint OK; mobile OK — 3c9c724
