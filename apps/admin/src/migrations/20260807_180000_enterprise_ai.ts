import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 08 — Enterprise AI Platform: Model/Assistant/Prompt/Policy registries + dashboard.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_ai_assistants_category" AS ENUM(
        'tutor','commercial','engineering','support','command','general'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_ai_assistants_status" AS ENUM(
        'draft','active','deprecated','disabled'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_ai_assistants_config_fallback_behavior" AS ENUM(
        'not_found','clarify','escalate'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_ai_models_status" AS ENUM('active','disabled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_ai_prompts_kind" AS ENUM(
        'system','security','style','domain'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "ai_models" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL,
      "provider" varchar NOT NULL,
      "model" varchar NOT NULL,
      "estimated_cost_per1k_tokens" numeric DEFAULT 0,
      "max_context_tokens" numeric DEFAULT 8000,
      "capabilities" jsonb,
      "status" "public"."enum_ai_models_status" DEFAULT 'active' NOT NULL,
      "priority" numeric DEFAULT 10,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ai_models_key_idx" ON "ai_models" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "ai_models_updated_at_idx" ON "ai_models" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "ai_models_created_at_idx" ON "ai_models" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "ai_assistants" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL,
      "name" varchar NOT NULL,
      "description" varchar,
      "owner_company_id" integer,
      "category" "public"."enum_ai_assistants_category" DEFAULT 'general' NOT NULL,
      "version" varchar DEFAULT '1.0.0' NOT NULL,
      "status" "public"."enum_ai_assistants_status" DEFAULT 'active' NOT NULL,
      "icon" varchar,
      "language" varchar DEFAULT 'pt-BR',
      "default_context" varchar,
      "capabilities" jsonb,
      "config_default_model_id" integer,
      "config_temperature" numeric DEFAULT 0.2,
      "config_max_context_chunks" numeric DEFAULT 6,
      "config_max_prompt_tokens" numeric DEFAULT 3500,
      "config_max_completion_tokens" numeric DEFAULT 800,
      "config_min_similarity" numeric DEFAULT 0.35,
      "config_require_citations" boolean DEFAULT true,
      "config_default_language" varchar DEFAULT 'pt-BR',
      "config_fallback_behavior" "public"."enum_ai_assistants_config_fallback_behavior" DEFAULT 'not_found',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ai_assistants_key_idx" ON "ai_assistants" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "ai_assistants_owner_company_idx" ON "ai_assistants" USING btree ("owner_company_id");
    CREATE INDEX IF NOT EXISTS "ai_assistants_updated_at_idx" ON "ai_assistants" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "ai_assistants_created_at_idx" ON "ai_assistants" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "ai_assistants"
        ADD CONSTRAINT "ai_assistants_owner_company_id_companies_id_fk"
        FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_assistants"
        ADD CONSTRAINT "ai_assistants_config_default_model_id_ai_models_id_fk"
        FOREIGN KEY ("config_default_model_id") REFERENCES "public"."ai_models"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "ai_assistants_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "ai_models_id" integer
    );
    DO $$ BEGIN
      ALTER TABLE "ai_assistants_rels"
        ADD CONSTRAINT "ai_assistants_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."ai_assistants"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_assistants_rels"
        ADD CONSTRAINT "ai_assistants_rels_ai_models_fk"
        FOREIGN KEY ("ai_models_id") REFERENCES "public"."ai_models"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "ai_assistants_rels_order_idx" ON "ai_assistants_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "ai_assistants_rels_parent_idx" ON "ai_assistants_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "ai_assistants_rels_path_idx" ON "ai_assistants_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "ai_assistants_rels_ai_models_id_idx" ON "ai_assistants_rels" USING btree ("ai_models_id");

    CREATE TABLE IF NOT EXISTS "ai_prompts" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "assistant_id" integer NOT NULL,
      "kind" "public"."enum_ai_prompts_kind" NOT NULL,
      "version" numeric DEFAULT 1 NOT NULL,
      "body" varchar NOT NULL,
      "active" boolean DEFAULT true,
      "changelog" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "ai_prompts_assistant_idx" ON "ai_prompts" USING btree ("assistant_id");
    CREATE INDEX IF NOT EXISTS "ai_prompts_updated_at_idx" ON "ai_prompts" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "ai_prompts_created_at_idx" ON "ai_prompts" USING btree ("created_at");
    DO $$ BEGIN
      ALTER TABLE "ai_prompts"
        ADD CONSTRAINT "ai_prompts_assistant_id_ai_assistants_id_fk"
        FOREIGN KEY ("assistant_id") REFERENCES "public"."ai_assistants"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "ai_policies" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "roles" jsonb,
      "priority" numeric DEFAULT 10,
      "enabled" boolean DEFAULT true,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "ai_policies_updated_at_idx" ON "ai_policies" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "ai_policies_created_at_idx" ON "ai_policies" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "ai_policies_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "ai_assistants_id" integer,
      "companies_id" integer,
      "courses_id" integer,
      "tenants_id" integer,
      "ai_models_id" integer
    );
    DO $$ BEGIN
      ALTER TABLE "ai_policies_rels"
        ADD CONSTRAINT "ai_policies_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."ai_policies"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_policies_rels"
        ADD CONSTRAINT "ai_policies_rels_ai_assistants_fk"
        FOREIGN KEY ("ai_assistants_id") REFERENCES "public"."ai_assistants"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_policies_rels"
        ADD CONSTRAINT "ai_policies_rels_companies_fk"
        FOREIGN KEY ("companies_id") REFERENCES "public"."companies"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_policies_rels"
        ADD CONSTRAINT "ai_policies_rels_courses_fk"
        FOREIGN KEY ("courses_id") REFERENCES "public"."courses"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_policies_rels"
        ADD CONSTRAINT "ai_policies_rels_tenants_fk"
        FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_policies_rels"
        ADD CONSTRAINT "ai_policies_rels_ai_models_fk"
        FOREIGN KEY ("ai_models_id") REFERENCES "public"."ai_models"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "ai_policies_rels_order_idx" ON "ai_policies_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "ai_policies_rels_parent_idx" ON "ai_policies_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "ai_policies_rels_path_idx" ON "ai_policies_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "ai_policies_rels_ai_assistants_id_idx" ON "ai_policies_rels" USING btree ("ai_assistants_id");
    CREATE INDEX IF NOT EXISTS "ai_policies_rels_companies_id_idx" ON "ai_policies_rels" USING btree ("companies_id");
    CREATE INDEX IF NOT EXISTS "ai_policies_rels_courses_id_idx" ON "ai_policies_rels" USING btree ("courses_id");
    CREATE INDEX IF NOT EXISTS "ai_policies_rels_tenants_id_idx" ON "ai_policies_rels" USING btree ("tenants_id");
    CREATE INDEX IF NOT EXISTS "ai_policies_rels_ai_models_id_idx" ON "ai_policies_rels" USING btree ("ai_models_id");

    CREATE TABLE IF NOT EXISTS "enterprise_ai_dashboard" (
      "id" serial PRIMARY KEY NOT NULL,
      "sessions_count" numeric DEFAULT 0,
      "total_tokens" numeric DEFAULT 0,
      "estimated_cost_usd" numeric DEFAULT 0,
      "avg_grounding_score" numeric DEFAULT 0,
      "avg_took_ms" numeric DEFAULT 0,
      "error_count" numeric DEFAULT 0,
      "avg_feedback_score" numeric DEFAULT 0,
      "usage_by_assistant" jsonb,
      "usage_by_company" jsonb,
      "models_used" jsonb,
      "last_refresh_at" timestamp(3) with time zone,
      "last_activity_summary" varchar DEFAULT 'Sem atividade',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    INSERT INTO "enterprise_ai_dashboard" ("id")
      SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM "enterprise_ai_dashboard" WHERE "id" = 1);

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "ai_models_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "ai_assistants_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "ai_prompts_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "ai_policies_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ai_policies_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ai_prompts_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ai_assistants_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ai_models_id";
    DROP TABLE IF EXISTS "enterprise_ai_dashboard" CASCADE;
    DROP TABLE IF EXISTS "ai_policies_rels" CASCADE;
    DROP TABLE IF EXISTS "ai_policies" CASCADE;
    DROP TABLE IF EXISTS "ai_prompts" CASCADE;
    DROP TABLE IF EXISTS "ai_assistants_rels" CASCADE;
    DROP TABLE IF EXISTS "ai_assistants" CASCADE;
    DROP TABLE IF EXISTS "ai_models" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_ai_prompts_kind";
    DROP TYPE IF EXISTS "public"."enum_ai_models_status";
    DROP TYPE IF EXISTS "public"."enum_ai_assistants_config_fallback_behavior";
    DROP TYPE IF EXISTS "public"."enum_ai_assistants_status";
    DROP TYPE IF EXISTS "public"."enum_ai_assistants_category";
  `);
}
