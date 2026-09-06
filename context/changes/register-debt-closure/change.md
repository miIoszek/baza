---
change_id: register-debt-closure
title: Close register debt after logo-r2 REJECTED review
status: planned
created: 2026-09-06
updated: 2026-09-06
archived_at: null
---

## Notes

Frame + plan for leftover from archived auth-company-logo-r2 REJECTED impl-review.
Decisions: boot fail-closed on `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`; admin-only register; treat deleteUser `{ error }` as compensation failure; unit tests with mocks; docs in `.env.example`.
Source frame: `context/changes/register-debt-closure/frame.md`
