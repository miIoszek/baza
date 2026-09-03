---
name: db-migrate
description: Scaffold a new Supabase migration file and apply it. Only the user can trigger this skill.
disable-model-invocation: true
---

Usage: /db-migrate <short_description>

$ARGUMENTS is the short description for the migration (e.g. "add_recipes_table").

Steps:

1. Generate a timestamp: `date +%Y%m%d%H%M%S` (use PowerShell `Get-Date -Format "yyyyMMddHHmmss"` on Windows).
2. Create the file `supabase/migrations/<timestamp>_<short_description>.sql`.
3. Scaffold the SQL with:
   - A `CREATE TABLE` or `ALTER TABLE` statement matching the user's intent.
   - `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;`
   - Placeholder RLS policies for SELECT, INSERT, UPDATE, DELETE — remind the user to review and tighten them.
4. Show the file contents and ask the user to review before applying.
5. After confirmation, run `npx supabase db push` to apply to the local Supabase instance.
6. If the user wants to apply to production, remind them to run `npx supabase db push --linked` and that the production project must be linked via `npx supabase link`.

Always require explicit user approval before running `npx supabase db push`.
