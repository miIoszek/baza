# Baza (Nx monorepo)

Transport job board MVP — **Angular** frontend + **NestJS** API in one Nx workspace.

Product context stays in `context/` (PRD, tech-stack, notes). This monorepo is the runnable code.

## Structure

| Path | Role |
|------|------|
| `apps/baza-api` | NestJS API (`@baza` Nest app) |
| `apps/baza-frontend` | Angular SPA |
| `libs/shared/types` | `@baza/shared-types` — DTOs/interfaces shared by API + UI |
| `libs/baza/ui` | `@baza/ui` — Angular UI kit (start with `PageShell`) |
| `libs/api/core` | `@baza/api-core` — Nest bootstrap helpers (CORS, validation, filters) |
| `libs/api/data-access` | `@baza/api-data-access` — DB/repos (hook Supabase/Prisma later) |

## Commands

```sh
npm install

# API  → http://localhost:3000/api
npx nx serve baza-api

# Frontend → http://localhost:4200  (proxies /api → :3000)
npx nx serve baza-frontend

# Build both
npx nx run-many -t build -p baza-api,baza-frontend

# Graph
npx nx graph
```

## Versions (as scaffolded)

- Nx 23.x
- Angular 22.x
- NestJS 11.x (newest supported by `@nx/nest@23`; Nest 12 peer-conflicts with Nx today)

## Course toolkit

`context/`, `skills/`, `prompts/`, `.cursor/` are course / agent tooling — keep them; do not treat them as app source.
