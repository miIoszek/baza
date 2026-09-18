import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Identity tables: accounts, rotating refresh tokens, one-time email tokens.
 * Business tables reference `user_account(id)` only (see DomainSchema).
 */
export class IdentitySchema1789700000001 implements MigrationInterface {
  name = 'IdentitySchema1789700000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_account" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(254) NOT NULL,
        "email_verified_at" timestamptz NULL,
        "password_hash" text NULL,
        "roles" text[] NOT NULL DEFAULT '{}',
        "status" varchar(16) NOT NULL DEFAULT 'active',
        "can_login" boolean NOT NULL DEFAULT true,
        "session_epoch" integer NOT NULL DEFAULT 1,
        "failed_login_count" integer NOT NULL DEFAULT 0,
        "locked_until" timestamptz NULL,
        "last_login_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "user_account_email_lowercase" CHECK ("email" = lower("email")),
        CONSTRAINT "user_account_email_len" CHECK (char_length("email") >= 3),
        CONSTRAINT "user_account_status_check" CHECK ("status" IN ('active', 'banned', 'deleted')),
        CONSTRAINT "user_account_login_needs_hash" CHECK ("can_login" = false OR "password_hash" IS NOT NULL),
        CONSTRAINT "user_account_session_epoch_positive" CHECK ("session_epoch" >= 1)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "user_account_email_key" ON "user_account" ("email")`,
    );

    await queryRunner.query(`
      CREATE TABLE "refresh_token" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "user_account" ("id") ON DELETE CASCADE,
        "family_id" uuid NOT NULL,
        "token_hash" char(64) NOT NULL UNIQUE,
        "generation" integer NOT NULL,
        "used_at" timestamptz NULL,
        "revoked_at" timestamptz NULL,
        "revoked_reason" varchar(32) NULL,
        "grace_reissue_count" integer NOT NULL DEFAULT 0,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "refresh_token_user_id_idx" ON "refresh_token" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "refresh_token_family_id_idx" ON "refresh_token" ("family_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "refresh_token_expires_at_idx" ON "refresh_token" ("expires_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "auth_one_time_token" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "user_account" ("id") ON DELETE CASCADE,
        "purpose" varchar(32) NOT NULL,
        "token_hash" char(64) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "auth_one_time_token_purpose_check"
          CHECK ("purpose" IN ('verify_email', 'reset_password'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "auth_one_time_token_user_purpose_idx" ON "auth_one_time_token" ("user_id", "purpose")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_one_time_token"`);
    await queryRunner.query(`DROP TABLE "refresh_token"`);
    await queryRunner.query(`DROP TABLE "user_account"`);
  }
}
