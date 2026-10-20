import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN CREATE TYPE "public"."enum_courses_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_classes_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_enrollments_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_certificates_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_companies_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_onboarding_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_onboarding_status" AS ENUM('NOT_STARTED','IN_PROGRESS','COMPLETED','REVIEW_REQUIRED','EXEMPTED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_consents_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_competency_history_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_interventions_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_interventions_action" AS ENUM('observation','recommend_content','assign_exercise','request_review','request_contact','follow_up','other');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_generated_exercises_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_generated_exercises_status" AS ENUM('GENERATED','VALIDATED','AVAILABLE','REJECTED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_generated_exercises_type" AS ENUM('multiple_choice','true_false','short_answer','diagnostic_case','calculation');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_generated_exercises_difficulty" AS ENUM('beginner','intermediate','advanced');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_assessment_blueprints_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_ils_audit_events_school_key" AS ENUM('fred-do-frio','cte');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "school_key" "public"."enum_courses_school_key";
    ALTER TABLE "lms_classes" ADD COLUMN IF NOT EXISTS "school_key" "public"."enum_lms_classes_school_key";
    ALTER TABLE "lms_enrollments" ADD COLUMN IF NOT EXISTS "school_key" "public"."enum_lms_enrollments_school_key";
    ALTER TABLE "lms_certificates" ADD COLUMN IF NOT EXISTS "school_key" "public"."enum_lms_certificates_school_key";
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "school_key" "public"."enum_companies_school_key";

    CREATE TABLE IF NOT EXISTS "ils_onboarding" (
      "id" serial PRIMARY KEY NOT NULL,
      "student_id" integer NOT NULL,
      "school_key" "public"."enum_ils_onboarding_school_key",
      "owner_company_id" integer,
      "status" "public"."enum_ils_onboarding_status" DEFAULT 'NOT_STARTED' NOT NULL,
      "current_step" varchar DEFAULT 'explanation',
      "pcar" jsonb,
      "goals" jsonb,
      "assessment_state" jsonb,
      "consent_id" numeric,
      "completed_at" timestamp(3) with time zone,
      "exempted_by_id" integer,
      "exempted_reason" varchar,
      "exempted_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "ils_consents" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "school_key" "public"."enum_ils_consents_school_key",
      "purpose" varchar DEFAULT 'educational_onboarding' NOT NULL,
      "text_version" varchar NOT NULL,
      "accepted" boolean DEFAULT false,
      "accepted_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "ils_competency_history" (
      "id" serial PRIMARY KEY NOT NULL,
      "student_id" integer NOT NULL,
      "school_key" "public"."enum_ils_competency_history_school_key",
      "competency_key" varchar NOT NULL,
      "score" numeric NOT NULL,
      "confidence" numeric DEFAULT 0,
      "evidence_count" numeric DEFAULT 1,
      "source_event" varchar,
      "previous_score" numeric,
      "snapshot_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "ils_interventions" (
      "id" serial PRIMARY KEY NOT NULL,
      "actor_id" integer NOT NULL,
      "student_id" integer NOT NULL,
      "course_id" integer,
      "class_ref_id" integer,
      "school_key" "public"."enum_ils_interventions_school_key",
      "reason" varchar NOT NULL,
      "action" "public"."enum_ils_interventions_action" DEFAULT 'observation' NOT NULL,
      "outcome" varchar,
      "suggested_by_ai" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "ils_generated_exercises" (
      "id" serial PRIMARY KEY NOT NULL,
      "school_key" "public"."enum_ils_generated_exercises_school_key",
      "course_id" integer,
      "lesson_id" integer,
      "student_id" integer,
      "instructor_id" integer,
      "status" "public"."enum_ils_generated_exercises_status" DEFAULT 'GENERATED' NOT NULL,
      "type" "public"."enum_ils_generated_exercises_type" DEFAULT 'multiple_choice' NOT NULL,
      "difficulty" "public"."enum_ils_generated_exercises_difficulty",
      "prompt" varchar NOT NULL,
      "expected_answer" varchar,
      "rubric" varchar,
      "explanation" varchar,
      "competencies" jsonb,
      "source_refs" jsonb,
      "generation_metadata" jsonb,
      "validated_by_id" integer,
      "validated_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "ils_assessment_blueprints" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "version" varchar DEFAULT 'v1' NOT NULL,
      "school_key" "public"."enum_ils_assessment_blueprints_school_key",
      "course_id" integer,
      "instructor_id" integer,
      "official" boolean DEFAULT true,
      "competencies" jsonb,
      "difficulty" jsonb,
      "question_count" numeric DEFAULT 10,
      "time_limit_minutes" numeric DEFAULT 40,
      "passing_score" numeric DEFAULT 70,
      "allowed_types" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "ils_audit_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "actor_id" integer,
      "student_id" integer,
      "school_key" "public"."enum_ils_audit_events_school_key",
      "action" varchar NOT NULL,
      "reason" varchar,
      "source" varchar,
      "previous_json" jsonb,
      "next_json" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "ils_audit_events";
    DROP TABLE IF EXISTS "ils_assessment_blueprints";
    DROP TABLE IF EXISTS "ils_generated_exercises";
    DROP TABLE IF EXISTS "ils_interventions";
    DROP TABLE IF EXISTS "ils_competency_history";
    DROP TABLE IF EXISTS "ils_consents";
    DROP TABLE IF EXISTS "ils_onboarding";
  `);
}
