import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "passing_score" numeric DEFAULT 70;
    ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "certificate_enabled" boolean DEFAULT true;

    DO $$ BEGIN CREATE TYPE "public"."enum_lms_classes_status" AS ENUM('draft','open','running','closed','archived');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_classes_modality" AS ENUM('online','in_person','hybrid');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_enrollments_status" AS ENUM('invited','active','completed','cancelled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_questions_type" AS ENUM('multiple_choice','true_false','short_answer','essay');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_questions_difficulty" AS ENUM('beginner','intermediate','advanced');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_assessments_status" AS ENUM('draft','published','closed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_attempts_status" AS ENUM('in_progress','submitted','graded','published');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_certificates_status" AS ENUM('valid','revoked');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_academic_events_type" AS ENUM('lesson','assessment','deadline','class_session','other');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE "public"."enum_lms_notifications_type" AS ENUM('assessment_available','deadline','grade_published','new_material','certificate_available');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "lms_classes" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "course_id" integer NOT NULL,
      "instructor_id" integer NOT NULL,
      "owner_company_id" integer,
      "starts_at" timestamp(3) with time zone,
      "ends_at" timestamp(3) with time zone,
      "status" "public"."enum_lms_classes_status" DEFAULT 'open' NOT NULL,
      "capacity" numeric,
      "modality" "public"."enum_lms_classes_modality" DEFAULT 'online',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "lms_enrollments" (
      "id" serial PRIMARY KEY NOT NULL,
      "student_id" integer NOT NULL,
      "course_id" integer NOT NULL,
      "class_ref_id" integer,
      "instructor_id" integer,
      "owner_company_id" integer,
      "status" "public"."enum_lms_enrollments_status" DEFAULT 'active' NOT NULL,
      "started_at" timestamp(3) with time zone,
      "completed_at" timestamp(3) with time zone,
      "cancelled_at" timestamp(3) with time zone,
      "progress_percent" numeric DEFAULT 0,
      "last_lesson_id" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "lms_question_banks" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "course_id" integer,
      "instructor_id" integer,
      "owner_company_id" integer,
      "description" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "lms_questions" (
      "id" serial PRIMARY KEY NOT NULL,
      "prompt" varchar NOT NULL,
      "type" "public"."enum_lms_questions_type" DEFAULT 'multiple_choice' NOT NULL,
      "bank_id" integer,
      "course_id" integer,
      "instructor_id" integer,
      "owner_company_id" integer,
      "difficulty" "public"."enum_lms_questions_difficulty" DEFAULT 'beginner',
      "competency_key" varchar,
      "options" jsonb,
      "points" numeric DEFAULT 1,
      "version" numeric DEFAULT 1,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "lms_assessments" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "instructions" varchar,
      "course_id" integer NOT NULL,
      "class_ref_id" integer,
      "instructor_id" integer,
      "owner_company_id" integer,
      "status" "public"."enum_lms_assessments_status" DEFAULT 'draft' NOT NULL,
      "question_ids" jsonb,
      "time_limit_minutes" numeric,
      "max_attempts" numeric DEFAULT 1,
      "passing_score" numeric DEFAULT 70,
      "randomize" boolean DEFAULT false,
      "opens_at" timestamp(3) with time zone,
      "due_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "lms_attempts" (
      "id" serial PRIMARY KEY NOT NULL,
      "assessment_id" integer NOT NULL,
      "student_id" integer NOT NULL,
      "course_id" integer,
      "instructor_id" integer,
      "owner_company_id" integer,
      "status" "public"."enum_lms_attempts_status" DEFAULT 'in_progress' NOT NULL,
      "attempt_number" numeric DEFAULT 1 NOT NULL,
      "answers" jsonb,
      "score" numeric,
      "max_score" numeric,
      "feedback" varchar,
      "started_at" timestamp(3) with time zone,
      "submitted_at" timestamp(3) with time zone,
      "graded_at" timestamp(3) with time zone,
      "published_at" timestamp(3) with time zone,
      "needs_manual_grade" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "lms_lesson_progress" (
      "id" serial PRIMARY KEY NOT NULL,
      "student_id" integer NOT NULL,
      "course_id" integer NOT NULL,
      "lesson_id" integer NOT NULL,
      "started_at" timestamp(3) with time zone,
      "completed_at" timestamp(3) with time zone,
      "completed" boolean DEFAULT false,
      "seconds_spent" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "lms_certificates" (
      "id" serial PRIMARY KEY NOT NULL,
      "code" varchar NOT NULL,
      "student_id" integer NOT NULL,
      "course_id" integer NOT NULL,
      "enrollment_id" integer,
      "issuer" varchar DEFAULT 'Omnia Frigo — LMS',
      "status" "public"."enum_lms_certificates_status" DEFAULT 'valid' NOT NULL,
      "issued_at" timestamp(3) with time zone NOT NULL,
      "revoked_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "lms_academic_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "type" "public"."enum_lms_academic_events_type" DEFAULT 'other' NOT NULL,
      "course_id" integer,
      "class_ref_id" integer,
      "assessment_id" integer,
      "instructor_id" integer,
      "owner_company_id" integer,
      "starts_at" timestamp(3) with time zone NOT NULL,
      "ends_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "lms_notifications" (
      "id" serial PRIMARY KEY NOT NULL,
      "recipient_id" integer NOT NULL,
      "type" "public"."enum_lms_notifications_type" NOT NULL,
      "title" varchar NOT NULL,
      "body" varchar,
      "href" varchar,
      "read" boolean DEFAULT false,
      "read_at" timestamp(3) with time zone,
      "course_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "lms_certificates_code_idx" ON "lms_certificates" USING btree ("code");
    CREATE INDEX IF NOT EXISTS "lms_enrollments_student_idx" ON "lms_enrollments" USING btree ("student_id");
    CREATE INDEX IF NOT EXISTS "lms_enrollments_course_idx" ON "lms_enrollments" USING btree ("course_id");
    CREATE INDEX IF NOT EXISTS "lms_attempts_student_idx" ON "lms_attempts" USING btree ("student_id");
    CREATE INDEX IF NOT EXISTS "lms_lesson_progress_student_lesson_idx" ON "lms_lesson_progress" USING btree ("student_id","lesson_id");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "lms_classes_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "lms_enrollments_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "lms_question_banks_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "lms_questions_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "lms_assessments_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "lms_attempts_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "lms_lesson_progress_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "lms_certificates_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "lms_academic_events_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "lms_notifications_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_notifications_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_academic_events_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_certificates_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_lesson_progress_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_attempts_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_assessments_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_questions_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_question_banks_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_enrollments_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_classes_id";
    DROP TABLE IF EXISTS "lms_notifications" CASCADE;
    DROP TABLE IF EXISTS "lms_academic_events" CASCADE;
    DROP TABLE IF EXISTS "lms_certificates" CASCADE;
    DROP TABLE IF EXISTS "lms_lesson_progress" CASCADE;
    DROP TABLE IF EXISTS "lms_attempts" CASCADE;
    DROP TABLE IF EXISTS "lms_assessments" CASCADE;
    DROP TABLE IF EXISTS "lms_questions" CASCADE;
    DROP TABLE IF EXISTS "lms_question_banks" CASCADE;
    DROP TABLE IF EXISTS "lms_enrollments" CASCADE;
    DROP TABLE IF EXISTS "lms_classes" CASCADE;
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "passing_score";
    ALTER TABLE "courses" DROP COLUMN IF EXISTS "certificate_enabled";
  `);
}
