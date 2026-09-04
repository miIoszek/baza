# GitHub Actions CI/CD — Plan Brief

> Full plan: `context/changes/github-actions/plan.md`

## What & Why

Add GitHub Actions so every PR is verified (lint/test/build) and merges to `main` auto-deploy the Nest API and/or Angular SPA when relevant paths change — fulfilling `tech-stack.md` (`github-actions` + `auto-deploy-on-merge`).

## Starting Point

Hosts are already live (Railway + Cloudflare Pages) via manual deploys; the repo has **no** `.github/workflows`. FE production env still has empty Supabase placeholders.

## Desired End State

PRs go green in Actions; merging to `main` redeploys only what changed (API and/or FE, including shared-lib bumps). Prod FE Auth works because anon keys are injected at build from GitHub Secrets.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| -------- | ------ | ---------------- |
| Scope | Verify + deploy on merge | Matches locked `ci_default_flow` |
| Triggers | CI on PR + `main`; deploy only on `main` | Gate PRs without deploying drafts |
| Checks | lint + test + build | Uses existing Nx/npm scripts |
| Deploy targets | Railway API + Pages FE | Same split as infra/deploy-plan |
| Path filters | App + shared libs + lock/nx config | Shared types safely redeploy both |
| Node | 22 + `.nvmrc`/`engines` | Aligns with `@types/node` ^22 |
| FE secrets | GitHub Secrets → env writer at build | Keeps anon keys out of git |

## Scope

**In scope:**
- `.github/workflows` for CI + path-filtered CD
- Node pin, root `lint` script, FE production env writer
- Docs update (`deploy-plan.md`, `AGENTS.md`)

**Out of scope:**
- PR preview environments
- E2E in CI
- Supabase migrations / R2 provisioning via Actions
- Branch protection admin (human in GitHub UI)

## Architecture / Approach

Two concerns: **verify** (no secrets) and **deploy** (Railway token + Cloudflare token + Supabase anon). Path filters decide which deploy job runs. FE build for Pages runs `scripts/write-fe-production-env.mjs` then `nx build` then `wrangler pages deploy`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Repo CI baselines | Node pin, lint script, env writer | Pre-existing lint failures |
| 2. Verify workflow | `ci.yml` on PR/`main` | First Actions permissions/setup |
| 3. Path-filtered deploy | `deploy.yml` + secrets | Wrong paths or missing tokens |
| 4. Docs sync | Operators know secrets/triggers | Stale deploy-plan confusion |

**Prerequisites:** GitHub repo admin to add Secrets; Railway + Cloudflare tokens; Supabase anon URL/key  
**Estimated effort:** ~1–2 sessions across 4 phases

## Open Risks & Assumptions

- Railway CLI/Action flags may need a one-time project/service link — confirm against current Railway docs at implement time.
- Lint may currently fail on the tree — Phase 1 must clear or explicitly waive blockers.
- Until Secrets exist, deploy workflow must not silently no-op as success.

## Success Criteria (Summary)

- PR CI runs lint/test/build
- Merge deploys only the changed surface(s)
- Prod FE Auth works after Pages deploy with injected anon keys
