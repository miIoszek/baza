---
starter_id: nx-angular-nest
package_manager: npm
project_name: baza
hints:
  language_family: js
  team_size: solo
  deployment_target: railway
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: best-effort
  path_taken: custom
  quality_override: true
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: true
    can_judge_agent: true
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

Baza is a TypeScript marketplace (company auth, job offers, route/home-cadence matching, CV apply). You know Angular and Nest, so the workspace is an **Nx monorepo** with:

- `apps/baza-api` — NestJS API (Railway deploy target)
- `apps/baza-frontend` — Angular SPA (Cloudflare Pages later)
- `libs/shared/types` (`@baza/shared-types`) — shared contracts between Nest and Angular
- `libs/baza/ui` (`@baza/ui`) — Angular UI library
- `libs/api/core` + `libs/api/data-access` — Nest helpers / future DB layer

Auth and Postgres+PostGIS stay on Supabase; files on Cloudflare R2. AI and background jobs stay out of MVP.

### Deviation from Nest-only bootstrap

Earlier hand-off (`starter_id: nestjs`, project `baza-api`) assumed Nest-first then Angular later. Locked decision: **Nx monorepo with both apps from day one**. Course lessons that show Astro / other starters: follow the ideas, map them onto these Nx apps/libs. `context/` remains the source of truth for product notes.

### Version notes

- Nx 23 + Angular 22 (current generators).
- NestJS 11.x is the newest line compatible with `@nx/nest@23` (Nest 12 peer range is blocked by the plugin today).

### Next implementation slice (agreed)

1. **Company signup + public profile** (FR-001, FR-002) — register with name, NIP, description, optional photo, base location; land on editable public profile.
2. **Publish job offer** (FR-003, FR-004) — free listing; show on profile + Job Offers list + map pin at base.
3. **Later:** driver browse/filter/apply without account + company inbox (FR-005–FR-009).

Infra for this slice: Supabase Auth (company accounts) + Postgres (company + offer data); map pin can be lat/lng or geocode from base location; PostGIS can wait until route filters need it.
