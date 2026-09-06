# Auth Supabase Session Implementation Plan

## Overview

Wire hybrid auth: Angular `@supabase/supabase-js` (anon) for login/logout/session persistence with auto-refresh; Nest JWT guard validating Bearer tokens; `GET /api/auth/me` returning user (company null until next change); navbar shows email when logged in.

## Current State Analysis

- Shell/theme and login/register stubs exist from `auth-shell-theme`.
- `.env.example` already lists `SUPABASE_*`; no local `.env`; Railway has keys per deploy-plan.
- Nest has no auth module; FE has no Supabase client.
- MCP lists unrelated inactive project — Baza keys live on Railway; FE needs public URL/anon in `environment*.ts` or build-time replace.

## Desired End State

- Login form calls `signInWithPassword`; logout via `signOut`.
- HTTP interceptor attaches `Authorization: Bearer <access_token>`.
- Nest rejects unauthenticated `/api/auth/me` with 401; valid JWT returns `{ user: { id, email }, company: null }`.
- Navbar: Login when logged out; email (+ logout) when logged in.

### Key Discoveries:

- Validate JWT with `supabase.auth.getUser(token)` using Nest client (anon or service role).
- Keep service role Nest-only; FE only anon.

## What We're NOT Doing

- `companies` table / register endpoint / company name in navbar
- R2 / photo
- Email confirmation flows (assume disabled in Supabase dashboard checklist)

## Implementation Approach

Shared types for `/me` response → Nest AuthModule (guard, controller) → FE supabase client + AuthService + interceptor → wire LoginPage + AppShell session UI.

## Phase 1: Nest JWT guard + /api/auth/me

### Overview

Auth module with Bearer validation and me endpoint.

### Changes Required:

#### 1. Shared MeResponse type

**File**: `libs/shared/types/src/lib/auth.ts` + barrel

**Intent**: Contract for `/api/auth/me`.

**Contract**: `{ user: { id: string; email: string | null }; company: null }` (company shape extended later).

#### 2. Nest AuthModule

**File**: `apps/baza-api/src/app/auth/` (+ wire `AppModule`)

**Intent**: Extract Bearer; `createClient(SUPABASE_URL, SUPABASE_ANON_KEY or SERVICE_ROLE).auth.getUser(token)`; `JwtAuthGuard`; `GET auth/me` returns MeResponse. Fail fast if env missing at runtime for guarded routes.

**Contract**: Route `GET /api/auth/me` under global prefix; 401 without/invalid token.

#### 3. Dependencies

**File**: root `package.json`

**Intent**: Add `@supabase/supabase-js` for Nest+FE.

**Contract**: Dependency installed.

### Success Criteria:

#### Automated Verification:

- `npx nx build baza-api` succeeds
- Unit/guard smoke test or compile-only if no secrets in CI

#### Manual Verification:

- With valid Bearer from Supabase session, `/api/auth/me` returns 200

---

## Phase 2: FE supabase client, interceptor, login/logout UI

### Overview

Session in browser; login works; navbar reflects session.

### Changes Required:

#### 1. Environment + client

**File**: `environment.ts`, `environment.production.ts`, `apps/baza-frontend/src/app/core/supabase.ts`, AuthService

**Intent**: Expose `supabaseUrl` + `supabaseAnonKey`; singleton client with localStorage persist (default).

**Contract**: Keys from env files (placeholders OK in repo; real values local/Pages — never commit secrets). Prefer reading `import.meta` not available; use environment object. Document filling keys in Notes.

#### 2. Interceptor + providers

**File**: `app.config.ts`, auth interceptor

**Intent**: `HttpInterceptorFn` adds Bearer from `supabase.auth.getSession()`.

**Contract**: All `/api` calls get header when session exists.

#### 3. Login page + AppShell

**File**: `login.ts`, `app-shell` inputs or AuthService injection in shell via app wrapper

**Intent**: Submit → signIn → navigate `/`; errors via MatSnackBar. AppShell shows email + logout when session; Login link when not.

**Contract**: AppShell accepts `@Input() accountLabel` and logout output OR inject AuthService from frontend (prefer frontend wrapper component `ShellHost` if UI lib can't depend on supabase). Prefer: keep AppShell presentational — pass `accountLabel` + `loggedIn` + outputs from App root that injects AuthService.

### Success Criteria:

#### Automated Verification:

- `npx nx build baza-frontend` succeeds
- `npx nx test baza-frontend` passes

#### Manual Verification:

- Login/logout with real Supabase user updates navbar

---

## Testing Strategy

### Unit Tests:

- Guard returns 401 without header (Nest)
- AuthService session signal smoke (optional)

### Manual Testing Steps:

1. Create test user in Supabase Auth (or register later)
2. Login on FE → navbar email
3. DevTools: `/api/auth/me` 200 with Bearer

## References

- Umbrella auth map; `context/deployment/deploy-plan.md` env table

## Progress

### Phase 1: Nest JWT guard + /api/auth/me

#### Automated

- [x] 1.1 `npx nx build baza-api` succeeds
- [x] 1.2 Auth module compiles with guard + me route

#### Manual

- [x] 1.3 Bearer `/api/auth/me` returns 200 against live Supabase

### Phase 2: FE supabase client, interceptor, login/logout UI

#### Automated

- [x] 2.1 `npx nx build baza-frontend` succeeds
- [x] 2.2 `npx nx test baza-frontend` passes

#### Manual

- [x] 2.3 Login/logout updates navbar with email
