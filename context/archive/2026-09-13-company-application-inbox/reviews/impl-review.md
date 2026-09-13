<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Company Application Inbox (S-05)

- **Plan**: `context/changes/company-application-inbox/plan.md`
- **Scope**: Phase 1–2 of 2 (full plan)
- **Date**: 2026-09-13
- **Verdict**: APPROVED (after triage)
- **Findings**: 0 critical, 3 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Grounding

Feature range `a908b9e^..1463a34`. Placeholder deleted. No `job-offers*` / `company-offers-list*` edits. Ownership + JwtAuthGuard + no `cv_file_key` on FE confirmed. Manual US-01 smoke confirmed by user 2026-09-13.

## Per-change drift matrix

### Phase 1–2

All planned items **MATCH** (shared list type, `getPrivateObject`, duplicate private `requireCompanyForUser`, Nest list + CV stream, controller DI, inbox page, routes, shell Skrzynka, blob download). Scope fence **MATCH**. Benign EXTRA: roadmap + context artifacts in feat commits.

## Findings

### F1 — Immediate `revokeObjectURL` after download click

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-frontend/src/app/pages/company/company-inbox-page.ts:46-51`
- **Detail**: `URL.revokeObjectURL(url)` runs immediately after `a.click()`. Some browsers may still need the blob URL when the download starts.
- **Fix**: Revoke after a short delay (`setTimeout(() => URL.revokeObjectURL(url), 1000)`).
- **Decision**: FIXED — delayed revokeObjectURL by 1s


- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `apps/baza-frontend/src/app/pages/company/company-inbox-page.ts:75-84`
- **Detail**: With `responseType: 'blob'`, Nest 4xx/5xx bodies arrive as `Blob`. Current code maps any Blob error to `"Nie udało się pobrać CV"`, losing 404/503 messages.
- **Fix A ⭐ Recommended**: Parse Blob as text/JSON and surface `message` when present.
- **Fix B**: Accept generic message for MVP; document as follow-up.
- **Decision**: FIXED via Fix A — parse Blob JSON for Nest `message`


- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `r2-storage.service.ts` + `company.controller.ts` StreamableFile
- **Detail**: Missing Body / NoSuchKey handled before stream. Mid-transfer R2 errors can yield truncated PDF under HTTP 200.
- **Fix A ⭐ Recommended**: Accept for MVP (CV ≤5 MB, rare); log stream `error` events; defer buffer-all if needed.
- **Fix B**: Buffer entire PDF in memory then respond (atomic status; higher memory).
- **Decision**: FIXED via Fix A — log + destroy on mid-stream R2 errors (MVP)

### F4 — Soft Desired End State vs empty offer title

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `company-inbox-page.html:32-34`
- **Detail**: Desired End State mentioned “title (or id fallback)”; Critical Details used empty title. UI omits title when empty.
- **Fix**: Optional — show `jobOfferId` when title empty.
- **Decision**: FIXED — show jobOfferId when title empty


- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `job-application.service.ts:171-175`
- **Detail**: Download uses DB key without asserting `applications/${company.id}/` prefix. Not HTTP-exploitable today (Nest-only writes).
- **Fix**: Optional reject if key prefix mismatches company.
- **Decision**: FIXED — reject cv_file_key outside applications/${company.id}/


- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: Progress 1.7, 2.6, 2.7
- **Detail**: Manual items `[x]`; user confirmed live smoke 2026-09-13. Automated ownership tests cover invariants.
- **Fix**: Dismiss — user confirmed.
- **Decision**: DISMISSED — user confirmed live smoke 2026-09-13
