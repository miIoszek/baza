---
change_id: testing-offer-filter-contract-parity
title: Offer filter & contract parity tests (silent filters, FE↔API)
status: implemented
created: 2026-09-14
updated: 2026-09-14
archived_at: null
---

## Notes

Open a change folder for rollout Phase 2 of context/foundation/test-plan.md: "Offer filter & contract parity".
Risks covered: #3 (Job Offers filters silently return wrong/empty matches), #4 (FE↔API filter/apply contract drift). Test types planned: unit + contract/integration.
Risk response intent: #3 fixed fixture offers + known filter inputs yield exactly the expected offer ID set; challenge "non-empty list means filters are correct"; avoid locking in today's buggy results. #4 same filter/apply fields mean the same thing on FE and API (shared contract); challenge "typecheck green ⇒ product contract holds"; avoid snapshotting entire DTOs without business rules.
