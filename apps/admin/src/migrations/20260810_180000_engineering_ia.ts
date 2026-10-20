import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 13 — Engenharia IA: engineering-profiles + dashboard.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_engineering_profiles_status" AS ENUM('active','disabled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "engineering_profiles" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL,
      "name" varchar NOT NULL,
      "company_id" integer,
      "company_name" varchar NOT NULL,
      "technical_area" varchar DEFAULT 'refrigeracao-industrial' NOT NULL,
      "specialty" varchar DEFAULT 'HVAC-R' NOT NULL,
      "language" varchar DEFAULT 'pt-BR' NOT NULL,
      "permissions" jsonb,
      "technology_lines" jsonb,
      "engineering_policy" varchar,
      "status" "public"."enum_engineering_profiles_status" DEFAULT 'active' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "engineering_profiles_key_idx" ON "engineering_profiles" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "engineering_profiles_company_idx" ON "engineering_profiles" USING btree ("company_id");
    CREATE INDEX IF NOT EXISTS "engineering_profiles_updated_at_idx" ON "engineering_profiles" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "engineering_profiles_created_at_idx" ON "engineering_profiles" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "engineering_profiles"
        ADD CONSTRAINT "engineering_profiles_company_id_companies_id_fk"
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "engineering_profiles_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "ai_models_id" integer
    );
    DO $$ BEGIN
      ALTER TABLE "engineering_profiles_rels"
        ADD CONSTRAINT "engineering_profiles_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."engineering_profiles"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "engineering_profiles_rels"
        ADD CONSTRAINT "engineering_profiles_rels_ai_models_fk"
        FOREIGN KEY ("ai_models_id") REFERENCES "public"."ai_models"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "engineering_profiles_rels_order_idx" ON "engineering_profiles_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "engineering_profiles_rels_parent_idx" ON "engineering_profiles_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "engineering_profiles_rels_path_idx" ON "engineering_profiles_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "engineering_profiles_rels_ai_models_id_idx" ON "engineering_profiles_rels" USING btree ("ai_models_id");

    CREATE TABLE IF NOT EXISTS "engineering_ai_dashboard" (
      "id" serial PRIMARY KEY NOT NULL,
      "consultations_count" numeric DEFAULT 0,
      "troubleshooting_count" numeric DEFAULT 0,
      "comparisons_count" numeric DEFAULT 0,
      "documents_used" jsonb,
      "avg_grounding_score" numeric DEFAULT 0,
      "avg_feedback_score" numeric DEFAULT 0,
      "avg_took_ms" numeric DEFAULT 0,
      "last_refresh_at" timestamp(3) with time zone,
      "last_activity_summary" varchar DEFAULT 'Sem atividade',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    INSERT INTO "engineering_ai_dashboard" ("id")
      SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM "engineering_ai_dashboard" WHERE "id" = 1);

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "engineering_profiles_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "engineering_profiles_id";
    DROP TABLE IF EXISTS "engineering_ai_dashboard" CASCADE;
    DROP TABLE IF EXISTS "engineering_profiles_rels" CASCADE;
    DROP TABLE IF EXISTS "engineering_profiles" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_engineering_profiles_status";
  `);
}
