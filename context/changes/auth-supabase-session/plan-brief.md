# Auth Supabase Session — Plan Brief

> Full plan: `context/changes/auth-supabase-session/plan.md`

## What & Why

Add hybrid Supabase session so companies can log in on the SPA while Nest trusts the same JWT for protected APIs — foundation for register and company profile.

## Starting Point

Dark shell + login/register stubs; no supabase-js; Nest has no auth; Railway already expected to hold `SUPABASE_*`.

## Desired End State

Login/logout with auto-refresh; Bearer interceptor; `GET /api/auth/me` returns user + `company: null`; navbar shows email when logged in.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Auth model | Hybrid FE supabase-js + Nest guard | Auto-refresh + server trust | Umbrella |
| /me company | null | Deferred to register change | Umbrella |
| Service role | Nest only | Security | Umbrella / infra |

## Scope

**In:** supabase-js, login, interceptor, guard, /me, navbar email  
**Out:** companies, register API, R2

## Phases at a Glance

| Phase | Delivers | Risk |
| ----- | -------- | ---- |
| 1 Nest guard+/me | Protected me | Missing local env |
| 2 FE session UI | Login + navbar | Placeholder anon keys |

**Prerequisites:** Supabase project + anon/service keys  
**Estimated effort:** 1 session
