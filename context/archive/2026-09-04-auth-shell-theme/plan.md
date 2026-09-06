# Auth Shell Theme Implementation Plan

## Overview

Ship a Material 3 dark shell (Grok-inspired palette), persistent AppShell navbar (`Baza` + Login), and routed home / login / register pages with centered auth-card stubs (company FR-001 field mockups, no API).

## Current State Analysis

- Angular Material ~22.1 is installed; `styles.scss` uses light `mat.$azure-palette` / `mat.$blue-palette` with `color-scheme: light`.
- Root `App` embeds health demo inside `PageShell`; `app.routes.ts` is empty; `router-outlet` is unused.
- `@baza/ui` exports only `PageShell` (no Material, no navbar).
- Umbrella auth map locks layout/UX; this change intentionally excludes Supabase, Nest auth, and R2.

## Desired End State

- Dark Material theme applied globally; light azure look gone.
- Every page shows AppShell: brand `Baza` left, `Login` button right (links to `/login`); content in `router-outlet`.
- Routes: `/` (home with health demo), `/login`, `/register`.
- Login/register stubs use centered card layout (title, subtitle, Material fields with icons, password visibility toggle, terms checkbox on register, full-width CTA, footer link) — no submit handlers to API.
- `npm run build` / frontend unit tests pass for touched specs.

### Key Discoveries:

- Theme entry: `apps/baza-frontend/src/styles.scss` via `project.json` styles array only (no angular.json).
- Shell swap point: `apps/baza-frontend/src/app/app.html` + `app.ts`.
- Empty routes: `apps/baza-frontend/src/app/app.routes.ts`.
- Prefer new `AppShell` in `@baza/ui`; keep `PageShell` for optional inner page framing or leave unused.

## What We're NOT Doing

- Supabase client, JWT, Nest auth endpoints
- Real form submit / validation beyond disabled or no-op UI
- Company name in navbar / session state
- R2 / photo upload
- Changing backend or deploy configs

## Implementation Approach

1. Introduce Grok dark tokens (theme file + `styles.scss`).
2. Add `AppShell` with MatToolbar + routerLink Login; wire root template to shell + outlet only.
3. Move health demo to a Home page; add Login/Register stub pages with Material form cards.
4. Update `app.spec.ts` for new DOM (navbar brand + routes).

## Phase 1: Dark Grok theme

### Overview

Replace light azure Material theme with dark Grok-inspired tokens.

### Changes Required:

#### 1. Theme SCSS

**File**: `apps/baza-frontend/src/styles/_theme.scss` (new) + `apps/baza-frontend/src/styles.scss`

**Intent**: Define dark color-scheme and Material 3 theme using custom/neutral dark primary close to Grok (near-black surface, high-contrast on-surface, muted primary accent — not purple/indigo default AI look). Wire from `styles.scss`.

**Contract**: `html` includes `mat.theme(...)`; `body { color-scheme: dark; }` uses `--mat-sys-*` for background/text. Optional CSS variables `--baza-*` for card/surface elevation if needed by auth cards.

### Success Criteria:

#### Automated Verification:

- Frontend production build succeeds: `npx nx build baza-frontend`
- No SCSS compile errors in build output

#### Manual Verification:

- Local serve shows dark background and Material tokens (not light azure)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: AppShell + routes + home

### Overview

Persistent navbar shell and routed home content.

### Changes Required:

#### 1. AppShell component

**File**: `libs/baza/ui/src/lib/app-shell/` + `libs/baza/ui/src/index.ts`

**Intent**: Standalone shell with MatToolbar: brand text/link `Baza` → `/`, spacer, `Login` button → `/login`, projected/content via `router-outlet` in the app (shell wraps content slot + optional ng-content). Add `@angular/material` as peer if missing.

**Contract**: Selector `baza-app-shell`; template exposes content projection for page body; navbar always visible.

#### 2. Root app wiring + home page

**File**: `apps/baza-frontend/src/app/app.ts`, `app.html`, `app.scss`, `app.routes.ts`, new `pages/home/`

**Intent**: Root only hosts AppShell + `router-outlet`. Move current health/cadence demo into HomeComponent at `/`.

**Contract**: Routes `{ path: '', component: Home }`, lazy or eager OK; remove conflicting light gradients from `app.scss`.

### Success Criteria:

#### Automated Verification:

- `npx nx build baza-frontend` succeeds
- `npx nx test baza-frontend --skip-nx-cache` passes (update specs)

#### Manual Verification:

- Navigate `/`, `/login` stub path reserved (may 404 until phase 3), navbar Baza + Login visible on home

---

## Phase 3: Login & register card stubs

### Overview

Centered Material auth cards matching agreed UX; company FR-001 field labels on register; no API.

### Changes Required:

#### 1. Login page

**File**: `apps/baza-frontend/src/app/pages/login/`

**Intent**: Card: title + subtitle, email, password with visibility toggle, full-width CTA, footer link to `/register`. Submit is no-op (or `preventDefault`).

**Contract**: Route `/login`; Material form fields; Polish copy.

#### 2. Register page

**File**: `apps/baza-frontend/src/app/pages/register/`

**Intent**: Same card chrome; fields: company name, NIP, email, location (placeholder `Polska, ul. Przykładowa 1, 00-001 Warszawa`), description textarea, password + confirm with toggles, required terms checkbox, CTA, footer to `/login`. No API.

**Contract**: Route `/register`.

#### 3. Specs

**File**: `apps/baza-frontend/src/app/app.spec.ts` (+ page specs if useful)

**Intent**: Assert shell brand and that routes render without crash.

**Contract**: Tests green under `nx test baza-frontend`.

### Success Criteria:

#### Automated Verification:

- `npx nx build baza-frontend` succeeds
- `npx nx test baza-frontend` passes

#### Manual Verification:

- `/login` and `/register` show centered dark cards; navbar Login works; footer links switch between pages

---

## Testing Strategy

### Unit Tests:

- App root renders AppShell / brand
- Router can activate login/register (smoke)

### Manual Testing Steps:

1. `npm run serve:frontend` — dark theme on load
2. Click Login — card layout
3. Open Register — FR-001 fields present; no network auth calls on CTA

## Performance Considerations

None beyond standard Material bundle (already a dependency).

## Migration Notes

N/A — UI-only; no data migration.

## References

- Umbrella map: Cursor plan `auth_register_login_a11921d9.plan.md`
- PRD FR-001 field set: `context/foundation/prd.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Dark Grok theme

#### Automated

- [x] 1.1 Frontend production build succeeds: `npx nx build baza-frontend`
- [x] 1.2 No SCSS compile errors in build output

#### Manual

- [x] 1.3 Local serve shows dark background and Material tokens (not light azure)

### Phase 2: AppShell + routes + home

#### Automated

- [x] 2.1 `npx nx build baza-frontend` succeeds
- [x] 2.2 `npx nx test baza-frontend` passes (update specs)

#### Manual

- [x] 2.3 Navigate home with navbar Baza + Login visible

### Phase 3: Login & register card stubs

#### Automated

- [x] 3.1 `npx nx build baza-frontend` succeeds
- [x] 3.2 `npx nx test baza-frontend` passes

#### Manual

- [x] 3.3 `/login` and `/register` show centered dark cards; footer links work
