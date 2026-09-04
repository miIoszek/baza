# Repository Guidelines

Baza is an Nx TypeScript monorepo: NestJS API (`apps/baza-api`) + Angular SPA (`apps/baza-frontend`). Product specs live under `@context/foundation/prd.md` and `@context/foundation/tech-stack.md`.

## Hard rules

- Never commit secrets: use `.env` (gitignored); keep `@.gitignore` patterns. Prefer `.env.example` for names only.
- Do not invent parallel app trees at repo root. Nest features go under `apps/baza-api/src`; Angular under `apps/baza-frontend/src/app` or `@baza/ui`.
- Shared DTOs/contracts belong in `@baza/shared-types` (`libs/shared/types`) before duplicating types in either app.
- Treat `context/`, `skills/`, `prompts/`, `.cursor/` as course/agent tooling — not runtime app source (`@README.md`).
- External stack lock: Auth/DB → Supabase; API host → Railway; FE → Cloudflare Pages; files → Cloudflare R2. Do not swap these without updating `@context/foundation/tech-stack.md`.
- Frontend already uses TypeScript `strict: true` (`@apps/baza-frontend/tsconfig.json`). Prefer the same discipline on Nest; validate HTTP bodies with `class-validator` DTOs (already a dependency).

## Project Structure & Module Organization

| Path | Alias / role |
|------|----------------|
| `apps/baza-api` | Nest API |
| `apps/baza-frontend` | Angular SPA (proxies `/api` → `:3000`) |
| `libs/shared/types` | `@baza/shared-types` |
| `libs/baza/ui` | `@baza/ui` |
| `libs/api/core` | `@baza/api-core` |
| `libs/api/data-access` | `@baza/api-data-access` |

Path aliases are defined in `@tsconfig.base.json`. Deeper layout: `@README.md`. First product slice: company signup + profile, then publish offer (`@context/foundation/tech-stack.md`).

## Build, Test, and Development Commands

- `npm run serve:api` — Nest on `http://localhost:3000/api`
- `npm run serve:frontend` — Angular on `http://localhost:4200`
- `npm run build` — build API + frontend
- `npm run test` — run tests for both apps
- `npm run graph` — Nx dependency graph

Lint via Nx/ESLint flat config `@eslint.config.mjs` (`@nx/enforce-module-boundaries`).

## Coding Style & Naming Conventions

TypeScript throughout. Follow Angular/Nest generators already in the tree (e.g. `@apps/baza-api/src/app/app.module.ts`, `@apps/baza-frontend/src/app/app.ts`). Prefer path aliases over deep relative imports across libs.

## Testing Guidelines

API: Jest (`@apps/baza-api/jest.config.cts`, root `@jest.config.ts`). Frontend: Angular unit-test target in `@apps/baza-frontend/project.json`. Run both with `npm run test`; single-project: `npx nx test baza-api` or `npx nx test baza-frontend`.

## Commit & Pull Request Guidelines

History so far uses descriptive subjects (e.g. `Initial commit: Baza Nx monorepo…`). Prefer Conventional Commits going forward (`feat:`, `fix:`, `chore:`). Remote: `https://github.com/miIoszek/baza.git`. No in-repo CI workflows yet — still run `npm run build` and `npm run test` before pushing.

## Security & Configuration Tips

Planned services and env expectations: `@context/foundation/tech-stack.md`. Agent-readiness notes: `@context/foundation/stack-assessment.md`.
