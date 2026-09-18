---
name: db-migrate
description: Scaffold a new TypeORM migration for the Baza Postgres schema and verify it. Only the user can trigger this skill.
disable-model-invocation: true
---

Usage: /db-migrate <short_description>

$ARGUMENTS is the short description for the migration (e.g. "add_offer_views").

The schema lives in `libs/api/data-access` (entities + migrations). The API is the ONLY database
client: there is no RLS and no PostgREST, so every invariant belongs in the schema (CHECK, FK,
unique/partial indexes) and in the service that writes it.

Steps:

1. Pick the timestamp: `node -e "console.log(Date.now())"`. It must be greater than the last file in
   `libs/api/data-access/src/lib/migrations/`.
2. Create `libs/api/data-access/src/lib/migrations/<timestamp>-<PascalName>.ts` with a class
   `<PascalName><timestamp> implements MigrationInterface`, `name` set to the same string, and raw SQL
   in `up` / `down` (copy the style of `1789700000002-DomainSchema.ts`). Add CHECK constraints for
   invariants, `ON DELETE` behaviour on every FK, and indexes for every foreign key / filter column.
   Do NOT add RLS policies or role grants.
3. Append the class to `ALL_MIGRATIONS` in `migrations/index.ts`.
4. If a table or column changed, update the entity in `libs/api/data-access/src/lib/entities/`.
5. Extend `apps/baza-api/src/testing/schema.integration.spec.ts` with a test for each new constraint.
6. Show the migration and ask the user to review it before running anything.
7. Verify against a real Postgres: `TEST_DATABASE_URL=postgresql://… npx jest -c apps/baza-api/jest.config.js apps/baza-api/src/testing`.
   (Locally: `docker compose up -d db`; each test file gets its own throw-away schema.)

Rules:

- Never edit a migration that has been applied anywhere (dev DB counts); add a new one.
- Migrations run automatically at API boot under a Postgres advisory lock, so **deploying the API is
  migrating**. Destructive changes (DROP/rename/type change) need explicit user approval and a
  backward-compatible rollout: the previous API version must keep working while the new one boots.
- `down` is best-effort documentation; production has no automated rollback. Restore from a backup
  (see `.claude/skills/baza-auth/references/operations.md`).
