---
change_id: auth-company-register
title: Company register FR-001 without logo upload
status: archived
created: 2026-09-04
updated: 2026-09-06
archived_at: 2026-09-06T18:25:21Z
---

## Notes

companies table + Nest POST /api/auth/register (user+company, no R2); FE register card wired; navbar company.name.

Checklist (Supabase Dashboard → Authentication → Providers → Email):
- Disable **Confirm email** OR set `SUPABASE_SERVICE_ROLE_KEY` on Railway/local so Nest uses admin.createUser with email_confirm.
- Mirror `SUPABASE_URL` + `SUPABASE_ANON_KEY` (+ service role) on Railway; anon also in FE `environment*.ts`.
