# GitHub Actions CI/CD Implementation Plan

## Overview

Add GitHub Actions for the Nx monorepo: **lint + test + build** on pull requests and on `main`, plus **path-filtered auto-deploy on merge to `main`** — Railway for the Nest API and Cloudflare Pages for the Angular SPA — matching `context/foundation/tech-stack.md` (`ci_provider: github-actions`, `ci_default_flow: auto-deploy-on-merge`).

## Current State Analysis

- No `.github/workflows` exist; `AGENTS.md` notes CI is still missing.
- Live hosts already exist per `context/deployment/deploy-plan.md` (Railway `baza-api`, Pages `baza-app`); redeploys are manual (`railway up`, `wrangler pages deploy`).
- Root scripts: `build`, `build:api`, `test`; **no** root `lint` script (Nx targets exist on both apps).
- `railway.toml` already builds API with `npx nx build baza-api --configuration=production`.
- FE production build uses `fileReplacements` → `environment.production.ts` with empty `supabaseUrl` / `supabaseAnonKey` — Auth in prod needs build-time injection.
- No Node pin (`.nvmrc` / `engines`); `@types/node` is `^22`.

### Key Discoveries:

- Path-aware deploy is required: API vs FE change independently; shared libs should redeploy **both**.
- Pages deploy artifact path: `dist/apps/baza-frontend/browser` (see deploy-plan).
- Lessons.md form-validation rule does not apply to this CI change.

## Desired End State

- Opening a PR runs CI (lint, test, build) and must go green before merge (when branch protection is enabled by the human).
- Merging to `main` always runs verify; additionally deploys API and/or FE only when relevant paths changed.
- Production FE builds include Supabase anon URL/key from GitHub Secrets (never committed).
- Node 22 is pinned for local + CI reproducibility.
- `deploy-plan.md` documents Actions as the primary redeploy path; manual cheat-sheet remains as fallback.

### How to verify:

- Push a PR that only touches docs → CI runs; no production deploy.
- Merge a change under `apps/baza-api/**` → Railway redeploys; Pages skipped.
- Merge a change under `apps/baza-frontend/**` → Pages redeploys; Railway skipped.
- Merge a change under `libs/shared/**` → both deploy.
- Prod FE can sign in / call Supabase anon (keys baked at build).

## What We're NOT Doing

- PR preview deploys (Railway ephemeral envs / Pages preview auto-CORS) — later change.
- E2E / Playwright in CI — no harness yet.
- GitHub Actions deploying Supabase migrations or R2 bucket setup.
- Enabling GitHub branch protection via API (human configures in GitHub UI).
- Replacing Railway’s own build with a prebuilt image upload (keep `railway up` / linked repo deploy so `railway.toml` stays source of truth) — unless CLI requires otherwise; prefer official Railway GitHub Action or `railway up` against linked project.
- Cloudflare Workers (`wrangler deploy`) — Pages only.
- Committing Supabase anon keys into the repo.

## Implementation Approach

1. Harden repo baselines (Node pin, `npm run lint`, FE prod env writer driven by env vars).
2. Add a **verify** workflow for PRs and `main`.
3. Add **deploy** jobs on `main` only, gated by path filters + required secrets.
4. Sync deployment docs / AGENTS so operators know secrets and triggers.

Workflow layout preference: one `ci.yml` (verify) and one `deploy.yml` (main-only deploys) for clear failure isolation — or a single workflow with separate jobs; implementer may choose either as long as triggers and path filters match this plan.

## Critical Implementation Details

**Path filter sets (load-bearing):**

- **API deploy if any of:** `apps/baza-api/**`, `libs/api/**`, `libs/shared/**`, `package-lock.json`, `package.json`, `nx.json`, `tsconfig.base.json`, `railway.toml`
- **FE deploy if any of:** `apps/baza-frontend/**`, `libs/baza/**`, `libs/shared/**`, `package-lock.json`, `package.json`, `nx.json`, `tsconfig.base.json`

**FE production env:** Before `nx build baza-frontend --configuration=production` in deploy (and optionally in CI verify if tests need real keys — **verify builds may keep empty placeholders**; only **Pages deploy build** must inject secrets). Writer script reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and existing `apiBaseUrl` default (Railway URL) — do not invent a second API host.

**Secrets (GitHub repo Secrets — human wires once):**

| Secret | Used by |
|--------|---------|
| `RAILWAY_TOKEN` | API deploy |
| `CLOUDFLARE_API_TOKEN` | Pages deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Pages deploy |
| `SUPABASE_URL` | FE production build (public anon project URL) |
| `SUPABASE_ANON_KEY` | FE production build (anon key only) |

Optional: `RAILWAY_SERVICE` / project id if CLI requires them — document exact flags after checking current Railway CLI Action docs at implement time.

---

## Phase 1: Repo CI baselines

### Overview

Pin Node 22 and add npm scripts / FE env writer so workflows stay thin.

### Changes Required:

#### 1. Node pin

**File**: `.nvmrc`, `package.json` (`engines`)

**Intent**: Lock Node 22 for local and Actions so CI does not float.

**Contract**: `.nvmrc` contains `22`. `package.json` `engines.node` allows `>=22 <23` (or `"22.x"`).

#### 2. Root lint script

**File**: `package.json`

**Intent**: Mirror `test` / `build` with a single lint entry for CI.

**Contract**: `"lint": "nx run-many -t lint -p baza-api,baza-frontend"` (or equivalent projects that own lint targets).

#### 3. FE production env writer

**File**: `scripts/write-fe-production-env.mjs` (new); optionally wire from `package.json` as `build:frontend:ci`

**Intent**: Generate/overwrite `environment.production.ts` from process env for Pages/CI deploy builds without committing secrets.

**Contract**: Requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`; sets `production: true`; keeps `apiBaseUrl` as today’s Railway origin unless `API_BASE_URL` override is provided. Fails non-zero if required vars missing. Committed `environment.production.ts` remains placeholder-safe for local clones.

#### 4. AGENTS.md CI line

**File**: `AGENTS.md`

**Intent**: Replace “No in-repo CI workflows yet” once workflows land (may land in Phase 4 if preferred — at latest before change closes).

**Contract**: Document `npm run lint` / CI expectation briefly.

### Success Criteria:

#### Automated Verification:

- `node -v` respects `.nvmrc` when using nvm/fnm (manual tool check OK)
- `npm run lint` exits successfully on a clean tree (or fails only on pre-existing lint debt — if lint is currently broken, fix blocking errors in this phase or note waiver in Progress)
- `node scripts/write-fe-production-env.mjs` with dummy env writes a valid TS module; without env exits non-zero

#### Manual Verification:

- Placeholder `environment.production.ts` in git still has empty supabase fields after local experiments (script output not committed)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before Phase 2.

---

## Phase 2: Verify workflow

### Overview

Add GitHub Actions job(s) that install deps and run lint, test, and build on PRs and pushes to `main`.

### Changes Required:

#### 1. CI workflow

**File**: `.github/workflows/ci.yml` (new)

**Intent**: Gate code quality on every PR and on `main`.

**Contract**:
- Triggers: `pull_request` + `push` branches `[main]`
- `actions/checkout`, `actions/setup-node@v4` with `node-version-file: '.nvmrc'` and npm cache
- `npm ci`
- `npm run lint`
- `npm run test`
- `npm run build` (or `nx run-many` equivalent for api + frontend)
- No deploy steps; no production secrets required for verify (FE production file may stay placeholders during `build`)

### Success Criteria:

#### Automated Verification:

- Workflow file is valid YAML and present under `.github/workflows/`
- Locally: `npm run lint && npm run test && npm run build` pass (same commands CI will run)

#### Manual Verification:

- After push: Actions tab shows a green (or first) CI run on a PR or `main`
- Failed lint/test would block confidence (spot-check by reading run logs)

**Implementation Note**: Pause for human confirmation that the workflow appeared in GitHub Actions before Phase 3.

---

## Phase 3: Deploy workflows (path-filtered)

### Overview

On `push` to `main` only, deploy API and/or FE when path filters match. Inject FE Supabase secrets only for the Pages build.

### Changes Required:

#### 1. Deploy workflow

**File**: `.github/workflows/deploy.yml` (new)

**Intent**: Auto-deploy on merge with independent API/FE jobs.

**Contract**:
- Trigger: `push` to `main` only
- Use path filter action (e.g. `dorny/paths-filter`) or equivalent job `paths:` so API/FE jobs are skipped when unrelated
- **API job**: checkout → setup-node → (optional `npm ci` if Railway builds in cloud from git) → deploy via Railway CLI/Action with `RAILWAY_TOKEN`; must target service `baza-api` / project from deploy-plan
- **FE job**: checkout → setup-node → `npm ci` → run `write-fe-production-env.mjs` with secrets → `npx nx build baza-frontend --configuration=production` → `npx wrangler pages deploy dist/apps/baza-frontend/browser --project-name=baza-app`
- Env for FE job: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Jobs `if:` skip cleanly when secrets missing only if documented — prefer fail-fast with clear message when deploying but secret absent

#### 2. Human secrets checklist (in plan Notes / deploy-plan)

**File**: `context/deployment/deploy-plan.md` (partial update OK here or Phase 4)

**Intent**: List exact GitHub secret names operators must create.

**Contract**: Table matching Critical Implementation Details secrets list; note tokens are human-only to create.

### Success Criteria:

#### Automated Verification:

- `deploy.yml` exists; path filter paths match the sets in Critical Implementation Details
- FE deploy job invokes env writer before production build
- Wrangler uses **pages deploy** (not Workers `wrangler deploy`)

#### Manual Verification:

- GitHub Secrets configured for Railway + Cloudflare + Supabase anon
- Merge a no-op or real path-scoped change and confirm only the expected deploy job runs
- `GET` Railway `/api/health` still OK after API deploy; Pages URL HTTP 200 after FE deploy
- Prod FE has working Supabase client (login/register smoke)

**Implementation Note**: Pause for human confirmation of a successful path-filtered deploy before Phase 4.

---

## Phase 4: Docs sync

### Overview

Make deployment docs and agent onboarding match Actions-first reality.

### Changes Required:

#### 1. Deploy plan

**File**: `context/deployment/deploy-plan.md`

**Intent**: Record CI/CD as live; refresh stale “Auth pending” / next_plan lines where outdated; keep manual fallback commands.

**Contract**: Frontmatter/`status` reflects Actions; section “GitHub Actions” with triggers, path filters, secret names; manual cheat-sheet retained under “Fallback”.

#### 2. AGENTS.md

**File**: `AGENTS.md`

**Intent**: State that CI exists and how to run the same checks locally.

**Contract**: Mention `npm run lint`, `test`, `build`; note deploy is Actions-on-main.

#### 3. Change status

**File**: `context/changes/github-actions/change.md`

**Intent**: Mark planned → done only after implement/review; this phase sets docs while implement skill owns status transitions during execution.

**Contract**: No premature `done` in this planning step — implement updates status.

### Success Criteria:

#### Automated Verification:

- Docs files exist and reference `.github/workflows/ci.yml` and `deploy.yml` by path

#### Manual Verification:

- A new contributor can follow deploy-plan to find which secrets to set without reading the plan chat

---

## Testing Strategy

### Unit Tests:

- No new app unit tests required for YAML CI.
- Smoke the env writer with a short node invocation (missing env → exit 1; present env → file contains URL/key).

### Integration Tests:

- CI pipeline itself is the integration test: green Actions runs.

### Manual Testing Steps:

1. Open PR → confirm `ci.yml` runs lint/test/build.
2. Merge API-only path → Railway job runs; Pages skipped.
3. Merge FE-only path → Pages job runs; Railway skipped.
4. Merge `libs/shared` → both deploy.
5. Confirm prod Auth still works after FE deploy with secrets.

## Performance Considerations

- `npm ci` + full monorepo build is acceptable for MVP; optional later: Nx affected — **out of scope** unless implementer finds trivial win without expanding scope.
- Path filters avoid unnecessary Railway/Pages deploys.

## Migration Notes

- First enable secrets before relying on deploy workflow; until secrets exist, keep deploy jobs from silently “succeeding” while skipping — fail or skip with explicit log.
- Existing manual Railway/Pages projects stay; Actions attaches to the same project names (`baza-api`, `baza-app`).

## References

- `context/foundation/tech-stack.md` — `ci_provider`, `auto-deploy-on-merge`
- `context/deployment/deploy-plan.md` — live URLs and manual commands
- `context/foundation/infrastructure.md` — Railway + Pages split; CI was out of research scope
- `railway.toml` — API build/start
- `apps/baza-frontend/project.json` — production `fileReplacements`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Repo CI baselines

#### Automated

- [x] 1.1 Node pin present (`.nvmrc` + `engines`) and lint script works: `npm run lint` — e858bfc
- [x] 1.2 Env writer succeeds with dummy env and fails without required vars — e858bfc

#### Manual

- [ ] 1.3 Placeholder `environment.production.ts` not accidentally committed with real keys

### Phase 2: Verify workflow

#### Automated

- [x] 2.1 `.github/workflows/ci.yml` exists with lint, test, build — e858bfc
- [x] 2.2 Local `npm run lint && npm run test && npm run build` pass — e858bfc

#### Manual

- [ ] 2.3 GitHub Actions shows a CI run for PR or `main`

### Phase 3: Deploy workflows (path-filtered)

#### Automated

- [x] 3.1 `deploy.yml` path filters match API/FE sets; Pages uses `wrangler pages deploy` — e858bfc
- [x] 3.2 FE job runs env writer before production build — e858bfc

#### Manual

- [ ] 3.3 Secrets configured; path-scoped merge deploys only the expected surface
- [ ] 3.4 Health/Pages smoke + prod Auth smoke after FE deploy

### Phase 4: Docs sync

#### Automated

- [x] 4.1 `deploy-plan.md` and `AGENTS.md` reference the new workflows — e858bfc

#### Manual

- [ ] 4.2 Secrets checklist is usable without chat context
