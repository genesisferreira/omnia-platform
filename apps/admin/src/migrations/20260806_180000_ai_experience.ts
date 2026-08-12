import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 06 — AI Experience: session turns, grounding, feedback, dashboard metrics.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "formatted_answer" varchar;
    ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "intent" varchar;
    ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "retrieval_took_ms" numeric DEFAULT 0;
    ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "llm_took_ms" numeric DEFAULT 0;
    ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "grounding_score" numeric DEFAULT 0;
    ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "explainability" jsonb;
    ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "grounding" jsonb;
    ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "turns" jsonb;
    ALTER TABLE "ai_sessions" ADD COLUMN IF NOT EXISTS "module_id" integer;

    DO $$ BEGIN
      ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_module_id_course_modules_id_fk"
        FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "ai_sessions_intent_idx" ON "ai_sessions" USING btree ("intent");
    CREATE INDEX IF NOT EXISTS "ai_sessions_module_idx" ON "ai_sessions" USING btree ("module_id");

    DO $$ BEGIN
      CREATE TYPE "public"."enum_ai_feedback_rating" AS ENUM('up','down');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "ai_feedback" (
      "id" serial PRIMARY KEY NOT NULL,
      "ai_session_id" integer NOT NULL,
      "rating" "public"."enum_ai_feedback_rating" NOT NULL,
      "comment" varchar,
      "user_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "ai_feedback_ai_session_idx" ON "ai_feedback" USING btree ("ai_session_id");
    CREATE INDEX IF NOT EXISTS "ai_feedback_rating_idx" ON "ai_feedback" USING btree ("rating");
    CREATE INDEX IF NOT EXISTS "ai_feedback_user_idx" ON "ai_feedback" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "ai_feedback_updated_at_idx" ON "ai_feedback" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "ai_feedback_created_at_idx" ON "ai_feedback" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_ai_session_id_ai_sessions_id_fk"
        FOREIGN KEY ("ai_session_id") REFERENCES "public"."ai_sessions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "ai_feedback_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_ai_feedback_fk"
        FOREIGN KEY ("ai_feedback_id") REFERENCES "public"."ai_feedback"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_ai_feedback_id_idx"
      ON "payload_locked_documents_rels" USING btree ("ai_feedback_id");

    ALTER TABLE "neurofrigo_ai_dashboard" ADD COLUMN IF NOT EXISTS "feedback_up_count" numeric DEFAULT 0;
    ALTER TABLE "neurofrigo_ai_dashboard" ADD COLUMN IF NOT EXISTS "feedback_down_count" numeric DEFAULT 0;
    ALTER TABLE "neurofrigo_ai_dashboard" ADD COLUMN IF NOT EXISTS "avg_grounding_score" numeric DEFAULT 0;
    ALTER TABLE "neurofrigo_ai_dashboard" ADD COLUMN IF NOT EXISTS "no_context_rate" numeric DEFAULT 0;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_ai_feedback_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_ai_feedback_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ai_feedback_id";
    DROP TABLE IF EXISTS "ai_feedback" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_ai_feedback_rating";
  `);
}
