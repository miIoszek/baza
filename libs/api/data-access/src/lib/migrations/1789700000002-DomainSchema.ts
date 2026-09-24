import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Business schema: the final state of the former Supabase migrations (companies, job_offers,
 * job_applications) with every CHECK preserved. Differences from Supabase:
 *  - `companies.user_id` references `user_account(id)` instead of `auth.users(id)`;
 *  - no RLS / anon / authenticated / service_role grants — the API connects as the table owner
 *    and is the only access path.
 */
export class DomainSchema1789700000002 implements MigrationInterface {
  name = 'DomainSchema1789700000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "user_account" ("id") ON DELETE CASCADE,
        "name" varchar(120) NOT NULL,
        "nip" varchar(10) NOT NULL,
        "description" varchar(2000) NOT NULL DEFAULT '',
        "base_location" varchar(200) NOT NULL DEFAULT '',
        "base_lat" double precision NULL,
        "base_lng" double precision NULL,
        "photo_key" text NULL,
        "photo_urls" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "companies_name_min_len" CHECK (char_length("name") >= 2),
        CONSTRAINT "companies_nip_digits" CHECK ("nip" ~ '^\\d{10}$'),
        CONSTRAINT "companies_base_coords_pair" CHECK (
          ("base_lat" IS NULL AND "base_lng" IS NULL)
          OR ("base_lat" IS NOT NULL AND "base_lng" IS NOT NULL)
        ),
        CONSTRAINT "companies_base_lat_range" CHECK (
          "base_lat" IS NULL OR ("base_lat" >= -90 AND "base_lat" <= 90)
        ),
        CONSTRAINT "companies_base_lng_range" CHECK (
          "base_lng" IS NULL OR ("base_lng" >= -180 AND "base_lng" <= 180)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "companies_created_at_id_idx" ON "companies" ("created_at" DESC, "id" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "job_offers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL REFERENCES "companies" ("id") ON DELETE CASCADE,
        "title" varchar(120) NOT NULL,
        "description" varchar(2000) NOT NULL,
        "home_return_cadence" varchar(32) NOT NULL,
        "required_years_experience" integer NOT NULL CHECK ("required_years_experience" >= 0),
        "required_transport_type" varchar(32) NOT NULL,
        "license_category" varchar(8) NOT NULL DEFAULT 'C',
        "routes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "salary_min" numeric(12, 2) NULL,
        "salary_max" numeric(12, 2) NULL,
        "salary_currency" varchar(3) NULL,
        "published" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "job_offers_title_len" CHECK (char_length("title") >= 2),
        CONSTRAINT "job_offers_description_len" CHECK (char_length("description") >= 1),
        CONSTRAINT "job_offers_license_category_check"
          CHECK ("license_category" IN ('B', 'C', 'CE', 'C_E')),
        CONSTRAINT "job_offers_salary_pair" CHECK (
          ("salary_min" IS NULL AND "salary_max" IS NULL AND "salary_currency" IS NULL)
          OR (
            "salary_currency" IS NOT NULL
            AND char_length("salary_currency") = 3
            AND ("salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max")
          )
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "job_offers_company_id_idx" ON "job_offers" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "job_offers_published_idx" ON "job_offers" ("published") WHERE "published" = true`,
    );

    await queryRunner.query(`
      CREATE TABLE "job_applications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "job_offer_id" uuid NOT NULL REFERENCES "job_offers" ("id") ON DELETE CASCADE,
        "company_id" uuid NOT NULL REFERENCES "companies" ("id") ON DELETE CASCADE,
        "email" varchar(254) NOT NULL,
        "phone" varchar(16) NOT NULL,
        "message" varchar(2000) NULL,
        "cv_file_key" text NOT NULL,
        "consent_accepted_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "job_applications_email_len" CHECK (
          char_length("email") >= 3 AND char_length("email") <= 254
        ),
        CONSTRAINT "job_applications_phone_len" CHECK (
          char_length("phone") >= 9 AND char_length("phone") <= 16
        ),
        CONSTRAINT "job_applications_phone_format" CHECK (
          "phone" ~ '^\\+?[0-9][0-9[:space:]()/-]{7,14}$'
          AND char_length(regexp_replace("phone", '[^0-9]', '', 'g')) BETWEEN 9 AND 15
        ),
        CONSTRAINT "job_applications_message_len" CHECK (
          "message" IS NULL OR char_length("message") <= 2000
        ),
        CONSTRAINT "job_applications_cv_key_len" CHECK (char_length("cv_file_key") >= 1)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "job_applications_company_id_idx" ON "job_applications" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "job_applications_job_offer_id_idx" ON "job_applications" ("job_offer_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "job_applications"`);
    await queryRunner.query(`DROP TABLE "job_offers"`);
    await queryRunner.query(`DROP TABLE "companies"`);
  }
}
