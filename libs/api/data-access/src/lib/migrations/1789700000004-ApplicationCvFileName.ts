import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Keeps the CV's original file name for the company inbox, and indexes the
 * (offer, e-mail) lookup that rejects a second application from one address.
 * Existing rows keep a NULL name — the inbox then shows a generic label.
 */
export class ApplicationCvFileName1789700000004 implements MigrationInterface {
  name = 'ApplicationCvFileName1789700000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_applications"
        ADD COLUMN "cv_file_name" varchar(255) NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "job_applications_offer_email_idx"
        ON "job_applications" ("job_offer_id", lower("email"))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "job_applications_offer_email_idx"`
    );
    await queryRunner.query(
      `ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "cv_file_name"`
    );
  }
}
