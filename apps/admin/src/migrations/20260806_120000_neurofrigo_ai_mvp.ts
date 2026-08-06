import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 05 — Neurofrigo AI MVP.
 * Collection: ai-sessions. Global: neurofrigo-ai-dashboard.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_ai_sessions_status" AS ENUM('ok','not_found','error','timeout');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "ai_sessions" (
      "id" serial PRIMARY KEY NOT NULL,
      "question" varchar NOT NULL,
      "answer_text" varchar,
      "status" "public"."enum_ai_sessions_status" DEFAULT 'ok' NOT NULL,
      "provider" varchar NOT NULL,
      "model" varchar NOT NULL,
      "took_ms" numeric NOT NULL,
      "prompt_tokens" numeric DEFAULT 0,
      "completion_tokens" numeric DEFAULT 0,
      "total_tokens" numeric DEFAULT 0,
      "estimated_cost_usd" numeric DEFAULT 0,
      "confidence" numeric DEFAULT 0,
      "error_code" varchar,
      "sources" jsonb,
      "filters" jsonb,
      "user_id" integer,
      "tenant_id" integer,
      "course_id" integer,
      "lesson_id" integer,
      "owner_company_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "ai_sessions_status_idx" ON "ai_sessions" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "ai_sessions_user_idx" ON "ai_sessions" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "ai_sessions_tenant_idx" ON "ai_sessions" USING btree ("tenant_id");
    CREATE INDEX IF NOT EXISTS "ai_sessions_course_idx" ON "ai_sessions" USING btree ("course_id");
    CREATE INDEX IF NOT EXISTS "ai_sessions_lesson_idx" ON "ai_sessions" USING btree ("lesson_id");
    CREATE INDEX IF NOT EXISTS "ai_sessions_owner_company_idx" ON "ai_sessions" USING btree ("owner_company_id");
    CREATE INDEX IF NOT EXISTS "ai_sessions_updated_at_idx" ON "ai_sessions" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "ai_sessions_created_at_idx" ON "ai_sessions" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_course_id_courses_id_fk"
        FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_lesson_id_lessons_id_fk"
        FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_owner_company_id_companies_id_fk"
        FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "neurofrigo_ai_dashboard" (
      "id" serial PRIMARY KEY NOT NULL,
      "questions_count" numeric DEFAULT 0,
      "avg_took_ms" numeric DEFAULT 0,
      "total_tokens" numeric DEFAULT 0,
      "estimated_cost_usd" numeric DEFAULT 0,
      "error_count" numeric DEFAULT 0,
      "not_found_count" numeric DEFAULT 0,
      "top_courses" jsonb,
      "top_questions" jsonb,
      "last_refresh_at" timestamp(3) with time zone,
      "last_activity_summary" varchar DEFAULT 'Sem atividade',
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "ai_sessions_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_ai_sessions_fk"
        FOREIGN KEY ("ai_sessions_id") REFERENCES "public"."ai_sessions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_ai_sessions_id_idx"
      ON "payload_locked_documents_rels" USING btree ("ai_sessions_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_ai_sessions_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_ai_sessions_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ai_sessions_id";
    DROP TABLE IF EXISTS "neurofrigo_ai_dashboard" CASCADE;
    DROP TABLE IF EXISTS "ai_sessions" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_ai_sessions_status";
  `);
}
