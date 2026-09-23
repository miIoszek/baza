import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfferEmploymentForms1789700000003 implements MigrationInterface {
  name = 'AddOfferEmploymentForms1789700000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_offers"
        ADD COLUMN "employment_forms" text[] NOT NULL DEFAULT '{}'
    `);
    await queryRunner.query(`
      UPDATE "job_offers"
      SET "employment_forms" = (
        CASE (abs(hashtext("id"::text)) % 7)
          WHEN 0 THEN ARRAY['uop']::text[]
          WHEN 1 THEN ARRAY['b2b']::text[]
          WHEN 2 THEN ARRAY['zlecenie']::text[]
          WHEN 3 THEN ARRAY['uop', 'b2b']::text[]
          WHEN 4 THEN ARRAY['uop', 'zlecenie']::text[]
          WHEN 5 THEN ARRAY['b2b', 'zlecenie']::text[]
          ELSE ARRAY['uop', 'b2b', 'zlecenie']::text[]
        END
      )
      WHERE cardinality("employment_forms") = 0
    `);
    await queryRunner.query(`
      ALTER TABLE "job_offers"
        ALTER COLUMN "employment_forms" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "job_offers"
        ADD CONSTRAINT "job_offers_employment_forms_check" CHECK (
          cardinality("employment_forms") >= 1
          AND "employment_forms" <@ ARRAY['uop', 'b2b', 'zlecenie']::text[]
        )
    `);
    await queryRunner.query(`
      CREATE INDEX "job_offers_employment_forms_gin_idx"
        ON "job_offers" USING GIN ("employment_forms")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "job_offers_employment_forms_gin_idx"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_offers" DROP CONSTRAINT IF EXISTS "job_offers_employment_forms_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_offers" DROP COLUMN IF EXISTS "employment_forms"`,
    );
  }
}
