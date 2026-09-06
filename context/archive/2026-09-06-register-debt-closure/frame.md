# Frame Brief: Register debt after logo-r2 REJECTED review

> Framing step before /10x-plan. Captures what is actually at issue, separated from what was initially assumed.

## Reported Observation

impl-review for archived `auth-company-logo-r2` still shows **Verdict: REJECTED**, with F1 (orphan Auth/R2 on partial register failure) and F5 (ad-hoc Nest/Multer errors) cited as the debt to close.

## Initial Framing (preserved)

- **User's stated cause or approach**: This is unfinished technical debt; unclear whether to do only Nest error handling (F5) or also re-verify orphan compensation (F1).
- **User's proposed direction**: Choose the right slice, then plan/fix before Module 2 product work.
- **Pre-dispatch narrowing** (evidence-based defaults when user asked agent to answer):
  1. Leading open leftover in docs: Nest/Multer follow-up (F5 was SKIPPED); F1 marked FIXED in the same review.
  2. No reported prod/local orphan/500 symptom — debt is review + follow-up in repo.
  3. Desired close-out: both re-verify F1 and address Nest follow-up before treating the debt as done.

## Dimension Map

The observation could originate at any of these dimensions:

1. **Process / document state** — REJECTED left on disk after triage FIXED decisions; no re-review flipped the verdict ← explains “REJECTED” as a fact without proving open critical runtime bugs
2. **Runtime orphan residual** — compensation exists but may still leave Auth users when service-role is missing or deleteUser fails silently ← user's “re-verify F1” concern
3. **HTTP error contract (F5 as stated)** — Multer `fileFilter` still throws raw `Error` → 500 ← user's “only Nest errors” option
4. **Broader Nest error-system follow-up** — deferred unified filter/DTO for validation/upload/upstream (TODO + follow-up doc) ← larger than F5

## Hypothesis Investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| Process/document: REJECTED is stale vs FIXED triage | `impl-review.md` still REJECTED + Safety FAIL while F1 Decision FIXED; only one review file; archive without verdict rewrite | **STRONG** |
| Runtime orphan residual after Fix A | `compensateFailedRegister` in `auth.service.ts`; skips Auth delete without service role (warn+return); deleteUser errors swallowed; no compensation tests | **STRONG** (residual risk, not “compensation missing”) |
| F5 as stated: Multer still raw Error → 500 | Current `auth.controller.ts` uses `BadRequestException` in `fileFilter`; Nest preserves HttpException | **NONE** for the original F5 bug |
| Broader unified Nest error system still open | TODO on controller; `follow-ups/backend-error-handling.md` still has TODO | **WEAK** as “F5”, **open** as separate cleanup scope |

## Narrowing Signals

- Binary “F5 vs re-verify F1” assumes both are equally unfinished; code shows F5-as-500 already fixed, F1 partially fixed with residual gaps.
- “REJECTED” is a process artifact, not by itself a runtime incident report.
- No user-reported orphan/500 after deploy; investigation is document + code path analysis.

## Cross-System Convention

Partial multi-store signup (Auth → object storage → DB) usually needs explicit compensation **and** proof (test or runbook) when admin credentials are optional. Review triage that marks Decision FIXED without recomputing overall Verdict commonly leaves stale REJECTED — that is a process smell, not a second product bug.

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: close *residual register integrity risk* (compensation gaps + proof) and stop treating a stale REJECTED review / already-fixed Multer-500 as the same unfinished work item; the deferred “unified Nest error system” is optional follow-up scope, not the F5 finding as written.

The initial framing (“F5 only vs also re-verify F1”) was the wrong cut. F1’s Fix A landed but is incomplete without service-role + verified delete behavior; F5’s original Multer→500 path is already gone. Planning should target hardening/verification of compensation (and optionally a small, separate error-system slice)—not a false choice between two equal leftovers.

## Confidence

- **HIGH** that “F5 vs F1” is the wrong binary and that REJECTED is stale process state.
- **HIGH** that residual Auth orphan paths still exist without service role / silent delete failure.
- **MEDIUM** on how large the Nest error-system follow-up should be if included (product urgency vs cleanup).

## What Changes for /10x-plan

Plan a change that: (1) verifies and hardens register compensation (service-role requirement or explicit fail-closed behavior; check deleteUser errors; add a focused test or manual proof), (2) does **not** re-implement F5 Multer→400 unless a regression is found, (3) treats unified Nest error handling as out of scope or a clearly separate later change unless the user explicitly wants that cleanup now.

## References

- `context/archive/2026-09-04-auth-company-logo-r2/reviews/impl-review.md` (F1 FIXED, F5 SKIPPED, Verdict REJECTED)
- `context/archive/2026-09-04-auth-company-logo-r2/follow-ups/backend-error-handling.md`
- `apps/baza-api/src/app/auth/auth.service.ts` — `compensateFailedRegister`
- `apps/baza-api/src/app/auth/auth.controller.ts` — `fileFilter` + `BadRequestException`
