# Add Sentry Error Monitoring — Implementation Plan

## Overview

Wire Sentry into the Nest API (Railway) and Angular SPA (Cloudflare Pages): two projects, no-op without DSN, capture **5xx + explicit high-value failures**, fix FE `refreshMe` swallow, upload source maps/releases on deploy. Unparks deep observability for the course/M3L5 optional path without adopting Astro/Cloudflare SDK from the lesson sample.

## Current State Analysis

- No `@sentry/*` packages; observability is Nest `Logger` + `AllExceptionsFilter` logging only `status >= 500`.
- API bootstrap: `dotenv` → `assertRequiredSupabaseEnv` → `NestFactory` → `configureApp` (`apps/baza-api/src/main.ts`, `libs/api/core`).
- FE: `bootstrapApplication` with `provideBrowserGlobalErrorListeners` only; page-local `catchError`/snackbars; production source maps off.
- Env split: API runtime on Railway; FE public config baked via `scripts/write-fe-production-env.mjs` in `deploy.yml`.
- API webpack already has `sourceMap: true`; deploy is `railway up` (build on Railway).
- Local uncommitted fix: `getCompanyForUser` throws `InternalServerErrorException` on DB error (include in this change if still uncommitted).
- FE twin still open: `AuthService.refreshMe` catch → `meSignal.set(null)`.

### Key Discoveries:

- Filter-only 5xx under-reports infra failures mapped to 400 — mitigate with **explicit** capture on chosen paths, not blanket 4xx.
- Two Sentry projects + shared release = git SHA correlates path-filtered deploys.
- `SENTRY_AUTH_TOKEN` must never enter FE bundle or Pages; API map upload uses Railway build-time secrets.

## Desired End State

1. Production API and FE send errors to separate Sentry projects when DSN is set; local/CI remain green with empty DSN (SDK no-op).
2. Unhandled/ Nest **5xx** appear in Sentry from `AllExceptionsFilter`; FE uncaught errors via ErrorHandler; FE HTTP **5xx** and network failures via interceptor.
3. Explicit capture (or message) on: register compensation failure, R2 `deletePrefix` failure, unexpected `refreshMe` failures.
4. FE `refreshMe` no longer treats API/network failure as “logged in, no company”; user-visible error or safe degrade + event in Sentry.
5. FE production builds upload (hidden) source maps in `deploy-frontend`; API uploads maps via Sentry webpack plugin during Railway `build:api`.
6. `.env.example`, deploy docs/checklist, and roadmap parked-item note reflect Sentry; agent MCP setup documented as post-setup (not blocking deploy).

**Verification:** lint/test/build green without DSNs; with DSNs configured, a deliberate 500 and a FE 5xx produce issues in the correct projects with usable stacks after map upload.

## What We're NOT Doing

- Capturing validation/expected **4xx** by default.
- `captureConsoleIntegration` for `warn` (noise on free tier).
- Fixing notFound masking on public company profile / offer detail (follow-up).
- Metrics dashboards, APM traces beyond what `@sentry/nestjs` / `@sentry/angular` enable by default with minimal config.
- Astro / `@sentry/cloudflare` / wrangler-tail lesson stack.
- Putting release upload in `ci.yml` (no secrets there).
- Changing unified error DTO / `backend-error-handling` follow-up.

## Implementation Approach

1. Document env contracts first so Railway/GH secrets can be created in parallel with code.
2. API: `@sentry/nestjs` init after dotenv; enrich `AllExceptionsFilter` for 5xx; webpack plugin for releases/maps using Railway env.
3. FE: `@sentry/angular` init + ErrorHandler; HTTP interceptor for 5xx/network; extend env model + writer; enable hidden production source maps; upload then deploy without serving maps.
4. Fix `refreshMe` + capture; commit API `getCompanyForUser` fix if still pending.
5. Docs + roadmap note; MCP as optional agent workflow.

## Critical Implementation Details

**Timing & lifecycle:** Initialize Sentry after `dotenv` / before `NestFactory.create` on API, and before `bootstrapApplication` on FE. Empty or missing DSN must leave SDKs inert so CI and local serve do not require secrets.

**Debug & observability:** Prefer explicit `Sentry.captureException` / `captureMessage` on named swallowed paths over console-warn integration. Release name should be the git SHA available at build (`GITHUB_SHA` in Actions; Railway git metadata or injected `SENTRY_RELEASE` / `RAILWAY_GIT_COMMIT_SHA` — implementer picks the var Railway actually exposes and documents it).

---

## Phase 1: Env & contracts

### Overview

Establish naming, docs, and FE env surface for DSNs without requiring live Sentry yet.

### Changes Required:

#### 1. Root env example

**File**: `.env.example`

**Intent**: Document `SENTRY_DSN` (API), optional `SENTRY_ENVIRONMENT`, and note that FE DSN is public and injected at Pages build — never document auth token as a local app secret for the browser.

**Contract**: SCREAMING_SNAKE names consistent with existing groups; comments distinguish Railway vs GitHub Actions vs FE bake.

#### 2. FE environment model + writer + placeholders

**Files**: `apps/baza-frontend/src/environments/environment.model.ts`, `environment.ts` / `environment.production.ts` / local patterns, `scripts/write-fe-production-env.mjs`

**Intent**: Add optional public `sentryDsn: string` (empty string when unset); writer reads `SENTRY_DSN` (or `SENTRY_DSN_FRONTEND` if split naming is clearer — prefer one public name `SENTRY_DSN` in Actions for FE job and document API DSN lives only on Railway).

**Contract**: `BazaEnvironment` gains `sentryDsn`; production writer always emits the field (empty if secret absent so builds do not fail); committed production file stays placeholder-safe.

#### 3. Deploy / ops notes

**Files**: `context/deployment/deploy-plan.md` and/or `context/foundation/infrastructure.md` (whichever already lists GitHub secrets)

**Intent**: List required secrets: Railway `SENTRY_DSN` (+ org/auth for webpack upload), Actions `SENTRY_DSN` (FE), `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (FE project slug). Two Sentry projects: `baza-api`, `baza-frontend`.

**Contract**: Explicit “never put auth token in Pages or environment.*.ts”.

### Success Criteria:

#### Automated Verification:

- `node scripts/write-fe-production-env.mjs` with only Supabase secrets still succeeds and emits `sentryDsn: ""` (or equivalent empty).
- Typecheck/lint for FE env model changes: `npx nx lint baza-frontend` (or project lint target used in CI).

#### Manual Verification:

- Secret checklist readable by a human setting up Sentry Developer plan + Railway/GH.

**Implementation Note**: After automated verification, pause for human confirmation of secret naming before Phase 2 if org/project slugs differ from `baza-api` / `baza-frontend`.

---

## Phase 2: API SDK, filter, maps

### Overview

Install `@sentry/nestjs` (and webpack plugin as needed), init in bootstrap, capture 5xx in the global filter, explicit capture on compensation/R2 delete failures, upload source maps during Railway production build.

### Changes Required:

#### 1. Dependencies

**File**: root `package.json`

**Intent**: Add `@sentry/nestjs` and the Sentry webpack plugin package required for Node source map upload during `nx build baza-api`.

**Contract**: Versions compatible with current Nest/Node; no app code change in this bullet beyond lockfile.

#### 2. Sentry init

**File**: `apps/baza-api/src/main.ts` (and small helper module under `apps/baza-api/src` if cleaner)

**Intent**: Initialize Sentry when `SENTRY_DSN` is non-empty; set environment/release from env; no-op otherwise.

**Contract**: Init runs after `loadEnv()`, before `NestFactory.create`. Bootstrap fatal path may also `captureException` before `process.exit`.

#### 3. Exception filter

**File**: `libs/api/core/src/lib/all-exceptions.filter.ts`

**Intent**: On `status >= 500`, keep Nest logger and also report to Sentry.

**Contract**: Do not report Multer/4xx. Preserve existing JSON response shape.

#### 4. Explicit high-value captures

**Files**: `apps/baza-api/src/app/auth/auth.service.ts` (compensation failure branches), `apps/baza-api/src/app/storage/r2-storage.service.ts` (`deletePrefixInBucket` catch)

**Intent**: When cleanup fails after already failing/succeeding the primary path, emit `captureMessage`/`captureException` at error level so best-effort swallows are visible.

**Contract**: Do not change compensation/rethrow semantics for register; do not make deletePrefix start failing callers.

#### 5. Include API swallowed-error fix if pending

**File**: `apps/baza-api/src/app/auth/auth.service.ts` (+ existing spec)

**Intent**: Ensure `getCompanyForUser` throws `InternalServerErrorException` on query error (already drafted locally) so `/auth/me` cannot look like “no company”.

**Contract**: Spec `propagates DB failure instead of returning null` remains green.

#### 6. Webpack plugin + Railway

**Files**: `apps/baza-api/webpack.config.js`, optionally `railway.toml` / deploy docs

**Intent**: Upload source maps and create release for `baza-api` during production `build:api` when Sentry auth env is present; skip upload when absent (local/CI).

**Contract**: Plugin gated on env; `sourceMap: true` retained; auth token only on Railway build environment.

### Success Criteria:

#### Automated Verification:

- `npx nx test baza-api` (or jest auth.service.spec) green including getCompanyForUser propagation.
- `npx nx build baza-api --configuration=production` succeeds without Sentry auth env.
- `npm run lint` for api/core changes green.

#### Manual Verification:

- With DSN on a running API: force a 500 (or temporary throw) and confirm issue in `baza-api` project.
- With auth token on Railway (or local dry-run): confirm release/artifacts appear after production build.

---

## Phase 3: FE SDK, interceptor, maps upload

### Overview

Browser Sentry, ErrorHandler, HTTP 5xx/network interceptor, hidden production source maps, upload in `deploy-frontend` before Pages deploy.

### Changes Required:

#### 1. Dependencies + init

**Files**: `package.json`, `apps/baza-frontend/src/main.ts`, `apps/baza-frontend/src/app/app.config.ts`

**Intent**: Add `@sentry/angular`; init from `environment.sentryDsn` when non-empty; register Sentry ErrorHandler (and TraceService if required by current Angular SDK docs for this Angular major).

**Contract**: Empty DSN → no-op; production flag from `environment.production`.

#### 2. HTTP error interceptor

**File**: new interceptor under `apps/baza-frontend/src/app/core/` + register in `app.config.ts` after `authInterceptor`

**Intent**: On HTTP responses with status ≥ 500 or network failure, `captureException` then rethrow/propagate so existing page handlers still run.

**Contract**: Do **not** capture 401/403/404/validation 4xx. Order: auth interceptor first.

#### 3. Production source maps

**File**: `apps/baza-frontend/project.json`

**Intent**: Enable production source maps in a form that supports Sentry upload without publicly serving maps (prefer hidden maps per Angular/Sentry guidance for this builder).

**Contract**: Development config unchanged; production budgets still pass or adjusted minimally if map artifacts affect size checks (prefer upload+delete over shipping maps to Pages).

#### 4. Deploy pipeline upload

**File**: `.github/workflows/deploy.yml` (frontend job)

**Intent**: After production build, upload sourcemaps with `SENTRY_AUTH_TOKEN` / org / FE project / release=`github.sha`; then deploy `dist/.../browser` without `.map` files if maps were not hidden-only.

**Contract**: Job fails closed if upload is configured incorrectly when token is present; if token absent, skip upload with a warning (or fail — prefer skip+warn so forks without secrets still document path; document that production org must set secrets). Prefer: skip upload when token missing so open PRs aren’t blocked — production main should have secrets.

### Success Criteria:

#### Automated Verification:

- `npx nx build baza-frontend --configuration=production` with empty sentryDsn succeeds.
- FE unit/lint targets used in CI green.
- Workflow YAML validates structurally (no syntax break).

#### Manual Verification:

- With FE DSN + token: deploy or local upload creates release; deliberate FE 5xx or thrown error shows demangled stack in `baza-frontend`.
- Pages site does not expose `.map` URLs publicly.

---

## Phase 4: Fix `refreshMe` swallow

### Overview

Stop treating `/auth/me` failure as null profile; report to Sentry; keep session coherent.

### Changes Required:

#### 1. AuthService.refreshMe

**File**: `apps/baza-frontend/src/app/core/auth.service.ts`

**Intent**: On unexpected HTTP/network errors, capture to Sentry and set an explicit error/degraded state (or leave previous `me` and surface snackbar/signal) — **must not** set `meSignal` to a success-shaped “no company” null that mimics “user has no company profile” when the request failed. Distinguish 401 (clear session) from 5xx/network if status available.

**Contract**: Successful 200 with `company: null` still means no company. Failed request ≠ no company. Add or update a focused unit test if the project already tests `AuthService`; otherwise a small spec is enough.

### Success Criteria:

#### Automated Verification:

- New/updated FE or existing test for refreshMe failure path green.
- Lint green.

#### Manual Verification:

- With API down or forced 500 on `/auth/me`, UI does not look like “logged in company without profile” in the same way as a true empty company; Sentry shows the event.

---

## Phase 5: Docs, roadmap, MCP note

### Overview

Close the loop for humans and agents: verification checklist, unpark roadmap wording, MCP optional.

### Changes Required:

#### 1. Roadmap

**File**: `context/foundation/roadmap.md`

**Intent**: Update the parked “Deep observability (Sentry…)” bullet to note Sentry is in progress via change `add-sentry` (or move to active notes) — do not invent a Change ID row in At a glance unless the roadmap template already supports non-slice items.

**Contract**: Forward-only clarity; do not claim “done” until archive.

#### 2. Verification / agent checklist

**File**: short section in `context/changes/add-sentry/` (e.g. `verify.md`) or append to infrastructure/deploy-plan

**Intent**: Checklist: Sentry UI issues after test 500; `railway logs`; FE issue; optional `@sentry/mcp-server` for agent diagnosis (access token, search_issues). Mirror M3L5 multi-layer verify idea without requiring MCP for merge.

**Contract**: No secrets in git.

### Success Criteria:

#### Automated Verification:

- Markdown files exist and link to this plan/research.

#### Manual Verification:

- Human can follow checklist after first production deploy with DSNs.

---

## Testing Strategy

### Unit Tests:

- API: keep/extend `getCompanyForUser` propagation test.
- FE: `refreshMe` failure must not assign success-shaped null company; interceptor does not capture 404.

### Integration Tests:

- Not required for SDK wiring; optional smoke that filter calls capture when status ≥ 500 can use a mocked Sentry module if cheap.

### Manual Testing Steps:

1. Local API without DSN — app boots, no errors.
2. Local API with DSN — throw 500 → issue in `baza-api`.
3. FE without DSN — build/serve OK.
4. FE with DSN — trigger 5xx via interceptor path → issue in `baza-frontend`.
5. After deploy with tokens — releases + demangled stacks.
6. Break `/auth/me` — confirm UX + Sentry, not silent “no company”.

## Performance Considerations

Default low sample rates for performance monitoring if the Angular/Nest SDK enables tracing — prefer errors-first; disable or set tracesSampleRate to 0 unless explicitly needed to save free-tier quota.

## Migration Notes

No DB migration. Existing production has no Sentry — first deploy after secrets are set starts sending events. Historical errors are not backfilled.

## References

- Research: `context/changes/add-sentry/research.md`
- Filter: `libs/api/core/src/lib/all-exceptions.filter.ts`
- FE auth swallow: `apps/baza-frontend/src/app/core/auth.service.ts`
- Deploy: `.github/workflows/deploy.yml`, `scripts/write-fe-production-env.mjs`
- Lesson context: M3L5 swallowed errors + monitoring (Nest/Railway equivalent of Sentry+logs)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Env & contracts

#### Automated

- [x] 1.1 `write-fe-production-env.mjs` succeeds with Supabase-only secrets and emits empty `sentryDsn`
- [x] 1.2 FE lint/typecheck for env model changes green

#### Manual

- [x] 1.3 Secret checklist reviewed for Railway + GitHub + two Sentry projects

### Phase 2: API SDK, filter, maps

#### Automated

- [ ] 2.1 `baza-api` tests green including getCompanyForUser propagation
- [ ] 2.2 Production API build succeeds without Sentry auth env
- [ ] 2.3 Lint green for api/core and API changes

#### Manual

- [ ] 2.4 Deliberate 500 appears in `baza-api` Sentry project when DSN set
- [ ] 2.5 Railway (or dry-run) release/source maps upload verified when auth present

### Phase 3: FE SDK, interceptor, maps upload

#### Automated

- [ ] 3.1 Production FE build with empty `sentryDsn` succeeds
- [ ] 3.2 FE lint/tests used in CI green
- [ ] 3.3 `deploy.yml` frontend job YAML remains valid

#### Manual

- [ ] 3.4 FE 5xx/uncaught error appears in `baza-frontend` with usable stack after map upload
- [ ] 3.5 Production Pages does not publicly serve `.map` files

### Phase 4: Fix `refreshMe` swallow

#### Automated

- [ ] 4.1 refreshMe failure-path test green
- [ ] 4.2 Lint green

#### Manual

- [ ] 4.3 Forced `/auth/me` failure: UI not success-shaped “no company”; Sentry event present

### Phase 5: Docs, roadmap, MCP note

#### Automated

- [ ] 5.1 Checklist/docs files exist and reference this plan

#### Manual

- [ ] 5.2 Human can execute post-deploy verification checklist
