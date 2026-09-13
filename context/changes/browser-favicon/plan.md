# Browser favicon matching Baza logo Implementation Plan

## Overview

Replace the stock Nx Angular tab icon with the Baza truck logo on a navy square, and set the document title to `Baza`, so the browser tab matches the in-app brand.

## Current State Analysis

`apps/baza-frontend/src/index.html` sets `<title>baza-frontend</title>` and `<link rel="icon" type="image/x-icon" href="favicon.ico" />`. The ICO at `apps/baza-frontend/public/favicon.ico` is the Nx generator default (16/32/48), not the brand. The visual logo is `apps/baza-frontend/public/baza-logo.png` (717×883 truck PNG, transparent), copied to `/baza-logo.png` via `project.json` assets (`public/**`). App shell and auth pages already use that PNG. `sharp` is a root dependency. No apple-touch-icon, no webmanifest. `src/assets/baza-logo.png` is an unused duplicate (not in the assets glob).

## Desired End State

Browser tabs (and bookmarks that pick up `/favicon.ico`) show the Baza truck on a `#020617` square, same mark as the navbar. The tab title reads `Baza`. Hard-refresh after deploy is expected because the URL stays `favicon.ico`.

### Key Discoveries:

- Brand source: `apps/baza-frontend/public/baza-logo.png` (tall PNG, no SVG).
- Favicon wiring: `index.html` L5–8 + `public/favicon.ico`; Cloudflare Pages deploys `dist/apps/baza-frontend/browser` with `public/` copied as-is.
- `sharp` is already in root `package.json` — suitable to rasterize a square PNG; ICO packing may need a one-off (committed binary is the deliverable, not a runtime dep).

## What We're NOT Doing

- apple-touch-icon, webmanifest, PWA, mask-icon, theme-color
- New favicon URL / cache-busting filename (product choice: overwrite `favicon.ico`)
- Per-route titles / Angular `Title` service
- Changing `html lang="en"`
- Deleting or unifying `src/assets/baza-logo.png`
- Redesigning the truck artwork

## Implementation Approach

One phase: generate a square multi-size ICO from `baza-logo.png` (contain, no stretch, pad with `#020617`), overwrite `public/favicon.ico`, set `<title>Baza</title>`. Commit the binary; no CI image pipeline required.

## Critical Implementation Details

The source PNG is taller than wide. Fit the truck inside a square canvas with even padding; do not stretch. Background must be `#020617` (app navy), not white. ICO should include at least 16×16, 32×32, and 48×48. After replace, browsers that already cached `/favicon.ico` will keep the Nx icon until a hard refresh or cache expiry — call that out in Manual verification.

## Phase 1: Favicon + document title

### Overview

Ship a Baza-branded ICO and tab title.

### Changes Required:

#### 1. Generate and replace favicon

**File**: `apps/baza-frontend/public/favicon.ico` (source: `apps/baza-frontend/public/baza-logo.png`)

**Intent**: Tab icon is the same truck as the navbar, on a navy square.

**Contract**: Overwrite `favicon.ico` in place. Square canvas, contain (not cover/stretch), fill `#020617`. Sizes 16, 32, 48 in one ICO. Do not change the `href` in `index.html` unless the link is broken.

#### 2. Document title

**File**: `apps/baza-frontend/src/index.html`

**Intent**: Tab label matches the product name shown in the shell.

**Contract**: `<title>Baza</title>`. Keep existing favicon `<link>` (`type="image/x-icon"`, `href="favicon.ico"`).

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-frontend` passes
- `npx nx lint baza-frontend` passes
- `npx nx build baza-frontend` emits `favicon.ico` under the browser output and the built `index.html` contains `<title>Baza</title>`

#### Manual Verification:

- Hard-refresh the app: tab icon is the navy-padded truck, not the Nx A
- Tab title is `Baza`
- `/favicon.ico` and `/baza-logo.png` still load; navbar logo unchanged

**Implementation Note**: After automated verification passes, pause for the human to hard-refresh the running app (cached ICO is the main risk).

---

## Testing Strategy

### Unit Tests:

- None required (static asset + one HTML string). Existing frontend tests must stay green.

### Integration Tests:

- None.

### Manual Testing Steps:

1. `npm run serve:frontend`, open `/`, hard-refresh (Cmd+Shift+R)
2. Confirm tab icon + title `Baza`
3. Spot-check login/register still show `/baza-logo.png` in the page, not as the only brand signal

## Performance Considerations

ICO is a few KB vs ~55 KB PNG; no runtime cost. Avoid adding `sharp` usage to the Angular bundle — generation is a one-off on the developer machine.

## Migration Notes

Same URL `/favicon.ico`. Users with a cached Nx icon need a hard refresh. No DB or API change.

## References

- Brand PNG: `apps/baza-frontend/public/baza-logo.png`
- Head tags: `apps/baza-frontend/src/index.html`
- Assets glob: `apps/baza-frontend/project.json` (`public/**`)
- Shell logo: `libs/baza/ui/src/lib/app-shell/app-shell.html`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Favicon + document title

#### Automated

- [x] 1.1 `npx nx test baza-frontend` passes
- [x] 1.2 `npx nx lint baza-frontend` passes
- [x] 1.3 `npx nx build baza-frontend` emits `favicon.ico` under the browser output and the built `index.html` contains `<title>Baza</title>`

#### Manual

- [x] 1.4 Hard-refresh the app: tab icon is the navy-padded truck, not the Nx A
- [x] 1.5 Tab title is `Baza`
- [x] 1.6 `/favicon.ico` and `/baza-logo.png` still load; navbar logo unchanged
