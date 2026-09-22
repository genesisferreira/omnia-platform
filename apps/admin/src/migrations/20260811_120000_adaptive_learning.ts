import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 15 — Adaptive Learning Engine.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_adaptive_decisions_action_type" AS ENUM(
        'CONTINUE_LESSON','REVIEW_LESSON','REVIEW_TOPIC','NEXT_MODULE','PRACTICE','ASSESSMENT','REVISIT_CONTENT','ASK_TUTOR'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_adaptive_decisions_outcome" AS ENUM('pending','accepted','ignored','completed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_adaptive_policies_scope" AS ENUM('global','tenant','company','course');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_adaptive_policies_status" AS ENUM('active','disabled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "adaptive_policies" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL,
      "version" varchar DEFAULT '1.0.0' NOT NULL,
      "scope" "public"."enum_adaptive_policies_scope" DEFAULT 'global' NOT NULL,
      "tenant_key" varchar,
      "company_id" integer,
      "course_id" integer,
      "minimum_competency_score" numeric DEFAULT 0.45,
      "review_threshold" numeric DEFAULT 0.4,
      "assessment_threshold" numeric DEFAULT 0.7,
      "stale_knowledge_days" numeric DEFAULT 14,
      "max_recommendations" numeric DEFAULT 5,
      "minimum_evidence_count" numeric DEFAULT 2,
      "review_risk_threshold" numeric DEFAULT 0.6,
      "skill_gap_threshold" numeric DEFAULT 0.45,
      "status" "public"."enum_adaptive_policies_status" DEFAULT 'active' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "adaptive_policies_key_idx" ON "adaptive_policies" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "adaptive_policies_updated_at_idx" ON "adaptive_policies" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "adaptive_policies_created_at_idx" ON "adaptive_policies" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "adaptive_decisions" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_key" varchar NOT NULL,
      "user_id" integer,
      "course_id" integer,
      "tenant_key" varchar,
      "action_type" "public"."enum_adaptive_decisions_action_type" NOT NULL,
      "reason" varchar NOT NULL,
      "reason_friendly" varchar,
      "priority" numeric DEFAULT 0,
      "confidence" numeric DEFAULT 0,
      "module_id" varchar,
      "lesson_id" varchar,
      "lesson_slug" varchar,
      "lesson_title" varchar,
      "competency_ids" jsonb,
      "evidence_ids" jsonb,
      "factors" jsonb,
      "plan" jsonb,
      "policy_key" varchar,
      "policy_version" varchar,
      "outcome" "public"."enum_adaptive_decisions_outcome" DEFAULT 'pending',
      "decided_at" timestamp(3) with time zone NOT NULL,
      "expires_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "adaptive_decisions_user_key_idx" ON "adaptive_decisions" USING btree ("user_key");
    CREATE INDEX IF NOT EXISTS "adaptive_decisions_course_idx" ON "adaptive_decisions" USING btree ("course_id");
    CREATE INDEX IF NOT EXISTS "adaptive_decisions_updated_at_idx" ON "adaptive_decisions" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "adaptive_decisions_created_at_idx" ON "adaptive_decisions" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "adaptive_learning_dashboard" (
      "id" serial PRIMARY KEY NOT NULL,
      "decisions_count" numeric DEFAULT 0,
      "actions_by_type" jsonb,
      "accepted_count" numeric DEFAULT 0,
      "ignored_count" numeric DEFAULT 0,
      "review_recommended_count" numeric DEFAULT 0,
      "avg_confidence" numeric DEFAULT 0,
      "students_with_gaps" numeric DEFAULT 0,
      "students_without_next_action" numeric DEFAULT 0,
      "by_course" jsonb,
      "avg_decide_ms" numeric DEFAULT 0,
      "last_refresh_at" timestamp(3) with time zone,
      "last_activity_summary" varchar DEFAULT 'Sem atividade',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    INSERT INTO "adaptive_learning_dashboard" ("id")
      SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM "adaptive_learning_dashboard" WHERE "id" = 1);

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "adaptive_decisions_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "adaptive_policies_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "adaptive_policies_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "adaptive_decisions_id";
    DROP TABLE IF EXISTS "adaptive_learning_dashboard" CASCADE;
    DROP TABLE IF EXISTS "adaptive_decisions" CASCADE;
    DROP TABLE IF EXISTS "adaptive_policies" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_adaptive_policies_status";
    DROP TYPE IF EXISTS "public"."enum_adaptive_policies_scope";
    DROP TYPE IF EXISTS "public"."enum_adaptive_decisions_outcome";
    DROP TYPE IF EXISTS "public"."enum_adaptive_decisions_action_type";
  `);
}
