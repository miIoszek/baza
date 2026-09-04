---
project: Baza
assessed_at: 2026-09-04T17:50:23+02:00
agent_readiness: ready-with-compensation
context_type: brownfield
stack_components:
  language: TypeScript
  framework: Angular 22 + NestJS 11 (Nx 23 monorepo)
  build_tool: Nx (@angular/build + webpack)
  test_runner: Jest (API); Angular unit-test / Vitest available
  package_manager: npm
  ci_provider: null
  deployment_target: null
gates_passed: 10
gates_failed: 1
---

## Stack Components

**Language — TypeScript.** Workspace root is `@baza/source` with `typescript` `~6.0.3` in `package.json`. Path aliases live in `tsconfig.base.json` (`@baza/shared-types`, `@baza/api-core`, `@baza/ui`, `@baza/api-data-access`). Root `tsconfig.base.json` sets `"strict": false`; the Angular app overrides to `"strict": true` in `apps/baza-frontend/tsconfig.json`. The Nest API app does not re-enable strict in `apps/baza-api/tsconfig.json` / `tsconfig.app.json`.

**Frameworks — Angular ~22.1 + NestJS ^11 inside Nx 23.** Apps: `apps/baza-frontend` (Angular, `@angular/build:application`) and `apps/baza-api` (Nest, `@nx/js:node` serve after webpack build). Libs: `libs/shared/types`, `libs/baza/ui`, `libs/api/core`, `libs/api/data-access`. Both frameworks are strongly convention-based (Angular modules/components/DI; Nest modules/controllers/providers).

**Build tool — Nx 23.2.** `nx.json` plus `@nx/angular`, `@nx/nest`, `@nx/webpack`. Frontend build via `@angular/build`; API via webpack (`apps/baza-api/webpack.config.js`). Scripts: `serve:api`, `serve:frontend`, `build`, `test`.

**Test runner — Jest for the API** (`apps/baza-api/jest.config.cts`, root `jest.config.ts` / `jest.preset.js`). Frontend uses `@angular/build:unit-test`; `vitest` is present in devDependencies but not the primary documented runner for the API.

**Package manager — npm** (`package-lock.json` present; no yarn/pnpm lockfiles).

**CI/CD — not detected** (no `.github/workflows`, GitLab CI, etc.). `tech-stack.md` records intended GitHub Actions + auto-deploy, not yet in-repo.

**Deployment — not detected in-repo** (no `Dockerfile`, `railway.json`, `wrangler.toml`). Planned targets from `context/foundation/tech-stack.md`: Railway (API), Cloudflare Pages (FE), Supabase (auth/DB), Cloudflare R2 (files).

**Instruction files — partial.** `.cursor/rules` exists (course rule). No root `AGENTS.md` or `CLAUDE.md` documenting monorepo conventions for agents.

## Quality Gate Assessment

| Component   | Typed | Convention | Training Data | Documented | Verdict |
|-------------|-------|------------|---------------|------------|---------|
| Language    | ~     | —          | —             | —          | pass-with-note |
| Framework   | —     | ✓          | ✓             | ✓          | pass |
| Build tool  | —     | ✓          | ✓             | ✓          | pass |
| Test runner | —     | —          | ✓             | ✓          | pass |

Legend: ✓ = pass, ✗ = fail, ~ = partial, — = not applicable

### Gate Details

**Typed (language) — partial / pass-with-note.** Evidence: TypeScript is the project language (`package.json` + `tsconfig.base.json`). Frontend enforces strict (`apps/baza-frontend/tsconfig.json` `"strict": true` + Angular `strictTemplates`). API inherits `"strict": false` from `tsconfig.base.json` without override — agents and humans get weaker contracts on Nest code than on Angular. Compensation: enable strict for the API (or whole base) and document boundary validation (`class-validator` already in deps).

**Convention-based (frameworks + Nx) — pass.** Evidence: Angular app under `apps/baza-frontend` with standard `src/app` layout; Nest under `apps/baza-api/src/app` with `app.module.ts` / controller / service; Nx `apps/` + `libs/` split with tags in `project.json`. Gap (not a gate fail): no AGENTS.md spelling out which lib owns what — useful compensation for dual-app agents.

**Popular in training data (per JS family) — pass.** Evidence: Angular, NestJS, Nx, Jest, and webpack are mainstream within the TypeScript/Node ecosystem; registry cards for `angular` and `nestjs` mark all four agent-friendly flags true.

**Well-documented — pass.** Evidence: official docs at https://angular.dev, https://docs.nestjs.com, https://nx.dev, Jest docs. Versions in `package.json` are current major lines (Angular 22, Nest 11, Nx 23).

**Test runner — pass** on training data and docs (Jest). Evidence: `apps/baza-api/jest.config.cts`, `@nestjs/testing` in devDependencies.

## Gaps & Compensation

### 1. TypeScript strict uneven (API vs frontend)

**What failed / weak:** Root and API configs leave `strict: false` while frontend is strict. Agents invent looser Nest types and miss nullability bugs.

**Why it matters:** Typed gate strength for Nest code is below Angular; cross-boundary DTOs in `@baza/shared-types` may not be enforced consistently.

**Compensation:** Turn on strict for API (and ideally `tsconfig.base.json`), keep using `class-validator` / `class-transformer` at HTTP boundaries.

### 2. No project AGENTS.md / CLAUDE.md for the monorepo

**What failed / weak:** Frameworks are conventional, but the *workspace* layout (two apps, four libs, deploy split) is not written down for agents. Only `.cursor/rules` (course) exists.

**Why it matters:** Agents may put UI in the API app, invent parallel folders, or ignore `@baza/*` path aliases.

**Compensation:** Add a root `AGENTS.md` (or `CLAUDE.md`) with apps/libs map, serve commands, and stack boundaries (Supabase / Railway / Cloudflare).

### 3. CI/CD and deploy configs not in repo yet

**What failed / weak:** Not a four-gate fail for framework, but operational gap vs `tech-stack.md` intent (GitHub Actions, Railway, Cloudflare).

**Why it matters:** Agents won’t know deploy constraints; regressions ship without checks.

**Compensation:** Document intended CI/deploy in AGENTS.md now; add workflows in Lesson 3 / later health-check follow-ups.

### Recommended Instruction File Additions

Paste into a new root `AGENTS.md` (or `CLAUDE.md`):

```markdown
## Workspace map (Nx)

- `apps/baza-api` — NestJS API (Railway). Entry: `apps/baza-api/src/main.ts`.
- `apps/baza-frontend` — Angular SPA (Cloudflare Pages later). Entry: `apps/baza-frontend/src/main.ts`.
- `libs/shared/types` (`@baza/shared-types`) — DTOs/contracts shared by API and FE. Prefer changing types here before duplicating interfaces.
- `libs/api/core` (`@baza/api-core`) — Nest cross-cutting helpers (filters, configure-app).
- `libs/api/data-access` (`@baza/api-data-access`) — DB / Supabase access (future).
- `libs/baza/ui` (`@baza/ui`) — shared Angular UI only.

Do not create parallel `src/` trees at repo root. New Nest features = modules under `apps/baza-api/src`. New Angular features = routes/components under `apps/baza-frontend/src/app` or `@baza/ui`.

## Commands

- API: `npm run serve:api` (`nx serve baza-api`)
- FE: `npm run serve:frontend` (`nx serve baza-frontend`)
- Build both: `npm run build`
- Test: `npm run test`

## TypeScript

- Prefer explicit types at function and HTTP boundaries.
- Frontend already uses `strict: true`. Treat Nest/API the same: enable `strict` in API tsconfigs; do not add `any` without a one-line comment why.
- Validate request bodies with `class-validator` DTOs at controllers (already a dependency).

## External services (do not invent alternatives)

- Auth + Postgres (+ PostGIS later): Supabase
- API host: Railway
- Frontend host: Cloudflare Pages
- Files: Cloudflare R2
- Secrets: `.env` only (gitignored); never commit keys

## Product source of truth

- PRD: `context/foundation/prd.md`
- Stack notes: `context/foundation/tech-stack.md`
- First slice: company signup + public profile, then publish job offer. Driver apply comes later.
```

Optional API tsconfig fix (code, not only docs):

```json
// apps/baza-api/tsconfig.json — add under compilerOptions
"strict": true
```

## Summary

Baza’s stack (**TypeScript + Angular + NestJS + Nx**) is mainstream, conventional, and well-documented within the JS family. Overall agent-readiness: **ready-with-compensation**.

**Strengths:** Dual opinionated frameworks, clear Nx `apps`/`libs` split, shared-types path aliases, frontend already on strict TypeScript, Jest wired for the API.

**Gaps:** API TypeScript not strict; no AGENTS.md describing monorepo + deploy boundaries; CI/deploy not yet in-repo.

**Recommended next step:** Add the AGENTS.md block above (and ideally `strict: true` on the API), then run `/10x-health-check` for dependency/CI health. After that, implement company signup + public profile.
