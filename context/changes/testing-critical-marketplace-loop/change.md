---
change_id: testing-critical-marketplace-loop
title: Critical marketplace loop tests (apply → inbox, CV isolation)
status: implemented
created: 2026-09-14
updated: 2026-09-14
archived_at: null
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "Critical marketplace loop".
Risks covered: #1 (apply→inbox missing), #2 (CV/contact visible to wrong party). Test types planned: integration (+ e2e only if research shows cheaper layers miss the loop).
Risk response intent: #1 prove owning company lists the application after apply; challenge "200 on apply ⇒ inbox OK"; avoid mirroring list-query implementation as oracle. #2 prove company B cannot download company A CV / private objects are not public; challenge "logged in ⇒ any CV"; avoid happy-path-only download tests.
