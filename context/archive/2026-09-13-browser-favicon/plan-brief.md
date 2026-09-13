# Browser favicon matching Baza logo — Plan Brief

> Full plan: `context/changes/browser-favicon/plan.md`

## What & Why

The tab still shows the Nx Angular icon and the title `baza-frontend`. We want the same truck as the navbar, plus the name **Baza**, so the browser chrome matches the product.

## Starting Point

`public/favicon.ico` is the generator default. Brand art is `public/baza-logo.png` (tall truck PNG). `index.html` already links `favicon.ico`; `public/**` is copied into the Cloudflare Pages build.

## Desired End State

Hard-refresh a tab: navy-square truck icon, title `Baza`. Navbar logo file and URL stay `/baza-logo.png`.

## Key Decisions Made

| Decision | Choice | Why |
| -------- | ------ | --- |
| Scope | Favicon + title only | Smallest change that matches the request; no PWA |
| Canvas | Contain on `#020617` square | Tall PNG must not stretch; navy matches the app |
| Title | `Baza` | Replaces leftover `baza-frontend` |
| Touch / PWA | Out of scope | Can wait; not needed for desktop tabs |
| Cache | Overwrite `favicon.ico` | Same URL; callers hard-refresh after deploy |

## Scope

**In scope:** generate ICO from `baza-logo.png`; replace `public/favicon.ico`; `<title>Baza</title>`.

**Out of scope:** apple-touch-icon, webmanifest, new filename, Angular `Title` service, `src/assets` cleanup, artwork redesign.

## Architecture / Approach

One-off rasterize (contain + navy pad) → commit ICO. No runtime image pipeline. `sharp` may be used locally; it must not land in the frontend bundle.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Favicon + document title | Branded ICO + title `Baza` | Browsers keep the old ICO until hard-refresh |

**Prerequisites:** none beyond existing `baza-logo.png`.
**Estimated effort:** one short session.

## Open Risks & Assumptions

- Cached `/favicon.ico` will look unchanged until hard-refresh.
- ICO packing is a generate-once step; quality at 16×16 may be muddy on a detailed truck.

## Success Criteria (Summary)

- Tab icon is the navy-padded Baza truck, not Nx.
- Tab title is `Baza`.
- In-app logo still loads from `/baza-logo.png`.
