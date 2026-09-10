<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Company Public Profile (S-01)

- **Plan**: context/changes/company-public-profile/plan.md
- **Scope**: Phases 1–3 of 3 (full plan)
- **Date**: 2026-09-09
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 2 warnings 4 observations
- **Triage**: F1 FIXED (Fix A), F2 FIXED (Fix B), F3 FIXED, F4 SKIPPED, F5 FIXED, F6 FIXED

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Success criteria verification (re-run 2026-09-09)

| Check | Result |
|-------|--------|
| `npm run lint` | PASS |
| `npx nx test baza-api` | PASS (11 suites / 38 tests) |
| `npx nx test baza-frontend` | PASS (5 files / 11 tests) |
| `npm run build` / FE production build | PASS (sandbox false-fail without unix sockets; green with full perms) |
| Manual Progress 1.4 / 2.3 / 3.4 | Marked `[x]` with commit SHAs; no contradiction in diff |

## Findings

### F1 — Auth user UUID leaked in public logo URLs

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: apps/baza-api/src/app/storage/r2-storage.service.ts:123
- **Detail**: Versioned keys are `companies/{userId}/logos/{uuid}/…`. Public `GET /api/companies/:id` returns `photoUrls` that embed the owner’s Auth UUID, undermining the plan’s “do not expose `user_id`” intent (field omitted from JSON, but present in CDN paths).
- **Fix A ⭐ Recommended**: Key new uploads under `companies/{companyId}/logos/{uuid}/` (or opaque random prefix); rewrite `photo_urls` on next logo replace
  - Strength: Stops leaking auth identity on the public surface; keeps versioned-key cache strategy.
  - Tradeoff: Migration / dual-path support for legacy `companies/{userId}/…` keys until rewritten.
  - Confidence: HIGH — company `id` is already the public identifier.
  - Blind spot: Existing logos keep leaking until replaced unless a one-shot rewrite runs.
- **Fix B**: Leave keys as-is; document that public CDN URLs may contain `user_id` as accepted MVP risk
  - Strength: Zero code change; matches current register + edit paths.
  - Tradeoff: Auth UUID remains enumerable from any public profile with a logo.
  - Confidence: MEDIUM — acceptable only if product accepts identity correlation risk.
  - Blind spot: Downstream features that treat `user_id` as private.
- **Decision**: FIXED via Fix A — logo keys use `companies/{companyId}/logos/{uuid}/`; register inserts company before upload; legacy userId keys cleaned on replace

### F2 — Public RLS SELECT exposes full company rows via anon key

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260904120000_create_companies.sql:19-21
- **Detail**: Policy `Companies are publicly readable` uses `using (true)`, so clients with the anon key can `SELECT` `user_id` and `photo_key` directly. Nest’s narrow select does not protect the Supabase REST path. S-01 public URLs make company `id`s easy to target. Pre-existing policy; amplified by shipping the public profile.
- **Fix A ⭐ Recommended**: Replace broad SELECT with a public view / column-restricted policy exposing only public fields
  - Strength: Closes the direct-DB leak regardless of Nest; aligns with “do not expose user_id/photo_key”.
  - Tradeoff: New migration + any client that relied on full-row anon SELECT must switch.
  - Confidence: HIGH — Nest already defines the public shape.
  - Blind spot: Whether any FE code currently queries `companies` via supabase-js (likely none for this slice).
- **Fix B**: Drop anon public SELECT and require all public reads through Nest
  - Strength: Single gate for public data.
  - Tradeoff: Breaks any direct client reads; couples FE to API availability.
  - Confidence: MEDIUM — depends on whether FE ever hits Supabase for companies.
  - Blind spot: Haven’t audited all supabase-js callers in this review.
- **Decision**: FIXED via Fix B — dropped public SELECT; public reads via Nest only; owners retain SELECT own row

### F3 — DB columns still unbounded `text` despite FE/BE max lengths

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260904120000_create_companies.sql:5-8
- **Detail**: FE and Nest lock name≤120, description≤2000, baseLocation≤200, NIP 10 digits (lessons.md). DB remains unconstrained `text`. Not bypassable via Nest ValidationPipe, but lessons ask to constrain the DB leg too.
- **Fix**: Add a follow-up migration with CHECK / length constraints matching the validation table.
- **Decision**: FIXED — `varchar` max lengths + NIP digit CHECK + name min 2 (`20260909121000_companies_field_length_limits.sql`); empty desc/location defaults kept at DB, MinLength(1) stays app-side

### F4 — PATCH “401 without token” claimed in plan but not unit-asserted

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: apps/baza-api/src/app/company/company.controller.spec.ts:31
- **Detail**: Phase 3 plan asked for PATCH 401 without token. Spec overrides `JwtAuthGuard`, so auth rejection is not asserted at HTTP level. Guard still enforces 401 in the running app.
- **Fix**: Add a thin e2e/integration-style test without guard override, or document that 401 is covered by the shared JwtAuthGuard suite.
- **Decision**: SKIPPED — 401 already covered by `jwt-auth.guard.spec.ts`; controller spec overrides guard by design

### F5 — BE photo MIME reject message is English

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: apps/baza-api/src/app/company/company.controller.ts:62
- **Detail**: Plan asked for clear Polish errors; FE messages are Polish; Nest `FileInterceptor` filter returns English (`Only JPEG, PNG, and WebP…`). Same pattern likely on register.
- **Fix**: Align BadRequestException copy with Polish FE strings (and register parity).
- **Decision**: FIXED — Polish MIME message on company + auth controllers and R2 storage (`Dozwolone są tylko pliki JPEG, PNG lub WebP`)

### F6 — Stale `?v=` comment after versioned R2 keys

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: apps/baza-frontend/src/app/pages/company/company-profile-page.ts:148
- **Detail**: Comment still mentions `?v=` cache bust; implementation uses versioned keys + immutable Cache-Control — no query param appended.
- **Fix**: Delete or rewrite the comment to describe versioned keys.
- **Decision**: FIXED — comment updated to versioned R2 keys (removed stale `?v=` wording)
