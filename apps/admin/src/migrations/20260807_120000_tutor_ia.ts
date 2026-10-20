import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 07 — Tutor IA: StudentProfile, LearningProfile, study plans, dashboard.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_learning_profiles_level" AS ENUM('beginner','intermediate','advanced','specialist');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "student_profiles" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_key" varchar NOT NULL,
      "user_id" integer,
      "tenant_id" integer,
      "course_id" integer NOT NULL,
      "enrolled_course_ids" jsonb,
      "progress_percent" numeric DEFAULT 0 NOT NULL,
      "completed_module_ids" jsonb,
      "completed_lesson_ids" jsonb,
      "last_activity_at" timestamp(3) with time zone,
      "study_time_minutes" numeric DEFAULT 0,
      "language" varchar DEFAULT 'pt-BR',
      "source" varchar DEFAULT 'lms-derived',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "student_profiles_user_key_idx" ON "student_profiles" USING btree ("user_key");
    CREATE INDEX IF NOT EXISTS "student_profiles_user_idx" ON "student_profiles" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "student_profiles_tenant_idx" ON "student_profiles" USING btree ("tenant_id");
    CREATE INDEX IF NOT EXISTS "student_profiles_course_idx" ON "student_profiles" USING btree ("course_id");

    CREATE TABLE IF NOT EXISTS "learning_profiles" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_key" varchar NOT NULL,
      "user_id" integer,
      "course_id" integer NOT NULL,
      "level" "public"."enum_learning_profiles_level" DEFAULT 'beginner' NOT NULL,
      "mastered_topics" jsonb,
      "pending_topics" jsonb,
      "reviewed_topics" jsonb,
      "difficulty_topics" jsonb,
      "ai_usage_count" numeric DEFAULT 0,
      "avg_grounding" numeric DEFAULT 0,
      "negative_feedback_count" numeric DEFAULT 0,
      "repeated_questions" jsonb,
      "gaps" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "learning_profiles_user_key_idx" ON "learning_profiles" USING btree ("user_key");
    CREATE INDEX IF NOT EXISTS "learning_profiles_user_idx" ON "learning_profiles" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "learning_profiles_course_idx" ON "learning_profiles" USING btree ("course_id");
    CREATE INDEX IF NOT EXISTS "learning_profiles_level_idx" ON "learning_profiles" USING btree ("level");

    CREATE TABLE IF NOT EXISTS "tutor_study_plans" (
      "id" serial PRIMARY KEY NOT NULL,
      "objective" varchar NOT NULL,
      "user_key" varchar NOT NULL,
      "user_id" integer,
      "course_id" integer NOT NULL,
      "steps" jsonb NOT NULL,
      "estimated_lessons" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "tutor_study_plans_user_key_idx" ON "tutor_study_plans" USING btree ("user_key");
    CREATE INDEX IF NOT EXISTS "tutor_study_plans_user_idx" ON "tutor_study_plans" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "tutor_study_plans_course_idx" ON "tutor_study_plans" USING btree ("course_id");

    CREATE TABLE IF NOT EXISTS "neurofrigo_tutor_dashboard" (
      "id" serial PRIMARY KEY NOT NULL,
      "avg_progress_percent" numeric DEFAULT 0,
      "tutor_ask_count" numeric DEFAULT 0,
      "top_questions" jsonb,
      "top_topics" jsonb,
      "recommendations_count" numeric DEFAULT 0,
      "study_plans_count" numeric DEFAULT 0,
      "avg_feedback_score" numeric DEFAULT 0,
      "learning_profiles_count" numeric DEFAULT 0,
      "student_profiles_count" numeric DEFAULT 0,
      "last_refresh_at" timestamp(3) with time zone,
      "last_activity_summary" varchar DEFAULT 'Sem atividade',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    INSERT INTO "neurofrigo_tutor_dashboard" ("id") SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM "neurofrigo_tutor_dashboard" WHERE "id" = 1);

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "student_profiles_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "learning_profiles_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "tutor_study_plans_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "student_profiles_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "learning_profiles_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "tutor_study_plans_id";
    DROP TABLE IF EXISTS "neurofrigo_tutor_dashboard" CASCADE;
    DROP TABLE IF EXISTS "tutor_study_plans" CASCADE;
    DROP TABLE IF EXISTS "learning_profiles" CASCADE;
    DROP TABLE IF EXISTS "student_profiles" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_learning_profiles_level";
  `);
}
