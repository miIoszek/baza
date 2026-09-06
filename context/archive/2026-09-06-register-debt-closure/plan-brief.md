# Register Debt Closure — Plan Brief

> Full plan: `context/changes/register-debt-closure/plan.md`
> Frame brief: `context/changes/register-debt-closure/frame.md`

## What & Why

> **The actual problem to plan around is**: close *residual register integrity risk* (compensation gaps + proof) and stop treating a stale REJECTED review / already-fixed Multer-500 as the same unfinished work item; the deferred “unified Nest error system” is optional follow-up scope, not the F5 finding as written.

We harden register so Auth orphans cannot be created without a recoverable admin delete path, and we prove it in CI.

## Starting Point

Compensation exists (`compensateFailedRegister`) but register still allows anon signup without service role, and `deleteUser` ignores `{ error }`. Multer MIME→400 is already fixed. No auth unit tests.

## Desired End State

Nest API refuses to boot without `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Register is admin-only; compensation logs real delete failures; Jest mocks lock the orphan-cleanup scenarios; `.env.example` states the boot rule.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Problem cut | Harden compensation + proof; not F5 / not unified Nest errors | F5 already fixed; REJECTED is stale process; residual orphan risk is real | Frame |
| Missing service role | Fail closed — **app must not run** without Supabase keys (incl. service role) | Compensation and admin createUser are useless without it; user requires boot gate | Plan (user) |
| `deleteUser` `{ error }` | Treat as compensation failure (log); keep original register error for client | Closes silent orphan hole without confusing HTTP semantics | Plan (user) |
| Proof | Unit tests with mocked Supabase admin + R2 | CI-safe regression guard without live secrets | Plan (user) |
| R2 at boot | Not required | Photo path already fail-closed when R2 missing | Frame / Plan |

## Scope

**In scope:**
- Boot-time validation of three Supabase env vars
- Admin-only register; compensation `deleteUser` error handling
- `auth.service.spec.ts` scenarios
- `.env.example` (+ light deploy/README note)

**Out of scope:**
- Multer F5 re-work; unified Nest exception filter
- R2 required at boot; FE changes; DB migrations; live orphan cleanup

## Architecture / Approach

`main.ts` (or shared helper) gates process start → `AuthService.register` always uses service-role admin client → on failure, `compensateFailedRegister` deletes R2 prefix via `deletePrefix` (if any) and Auth user, checking `deleteUser` errors → Jest mocks `createClient` + R2 to assert side effects.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Fail-closed env + compensation | Boot gate + admin-only register + deleteUser error check | Breaks envs that ran anon-only without service role |
| 2. Unit tests | Mocked compensation coverage in CI | Mocks drift from real supabase-js admin API |
| 3. Operator docs | Clear required-keys note in `.env.example` | Docs drift if someone softens the gate later |

**Prerequisites:** Railway/local `.env` already has (or can add) `SUPABASE_SERVICE_ROLE_KEY`; frame brief approved.
**Estimated effort:** ~2–3 short sessions across 3 phases.

## Open Risks & Assumptions

- Any environment historically running API without service role will fail to start until the key is set (intentional).
- Historical Auth orphans from past anon-only failures are not cleaned by this change.
- Boot gate covers Nest API only — frontend remains anon-key public config.

## Success Criteria (Summary)

- API does not listen without the three Supabase keys
- Failed register after Auth create triggers Auth delete (and R2 cleanup when applicable), with non-silent delete failures
- CI unit tests cover those scenarios; operators see the requirement in `.env.example`
