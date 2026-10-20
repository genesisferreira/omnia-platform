import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 14 — Student Intelligence Platform.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_sip_evidence_source_type" AS ENUM(
        'tutor','lms','assessment','exercise','study_time','question','attempt','feedback','engineering','commercial'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "sip_profiles" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_key" varchar NOT NULL,
      "user_id" integer,
      "course_id" integer,
      "language" varchar DEFAULT 'pt-BR',
      "technical_level" varchar DEFAULT 'beginner',
      "progress_percent" numeric DEFAULT 0,
      "study_time_minutes" numeric DEFAULT 0,
      "competencies" jsonb,
      "objectives" jsonb,
      "preferences" jsonb,
      "recommendations" jsonb,
      "insights" jsonb,
      "evidence_summary" jsonb,
      "history" jsonb,
      "assistant_context" varchar,
      "version" numeric DEFAULT 1,
      "last_recalculated_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "sip_profiles_user_key_idx" ON "sip_profiles" USING btree ("user_key");
    CREATE INDEX IF NOT EXISTS "sip_profiles_user_idx" ON "sip_profiles" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "sip_profiles_course_idx" ON "sip_profiles" USING btree ("course_id");
    CREATE INDEX IF NOT EXISTS "sip_profiles_updated_at_idx" ON "sip_profiles" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "sip_profiles_created_at_idx" ON "sip_profiles" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "sip_profiles"
        ADD CONSTRAINT "sip_profiles_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "sip_profiles"
        ADD CONSTRAINT "sip_profiles_course_id_courses_id_fk"
        FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "sip_evidence" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_key" varchar NOT NULL,
      "course_id" integer,
      "source_type" "public"."enum_sip_evidence_source_type" NOT NULL,
      "source_id" varchar,
      "competency_key" varchar,
      "strength" numeric DEFAULT 0 NOT NULL,
      "confidence" numeric DEFAULT 0 NOT NULL,
      "summary" varchar NOT NULL,
      "payload" jsonb,
      "observed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "sip_evidence_user_key_idx" ON "sip_evidence" USING btree ("user_key");
    CREATE INDEX IF NOT EXISTS "sip_evidence_course_idx" ON "sip_evidence" USING btree ("course_id");
    CREATE INDEX IF NOT EXISTS "sip_evidence_competency_key_idx" ON "sip_evidence" USING btree ("competency_key");
    CREATE INDEX IF NOT EXISTS "sip_evidence_updated_at_idx" ON "sip_evidence" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "sip_evidence_created_at_idx" ON "sip_evidence" USING btree ("created_at");
    DO $$ BEGIN
      ALTER TABLE "sip_evidence"
        ADD CONSTRAINT "sip_evidence_course_id_courses_id_fk"
        FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "sip_audit_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_key" varchar NOT NULL,
      "course_id" integer,
      "origin" varchar NOT NULL,
      "event" varchar NOT NULL,
      "evidence_ids" jsonb,
      "model" varchar DEFAULT 'sip-rules-v1',
      "confidence" numeric DEFAULT 0,
      "payload" jsonb,
      "occurred_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "sip_audit_events_user_key_idx" ON "sip_audit_events" USING btree ("user_key");
    CREATE INDEX IF NOT EXISTS "sip_audit_events_course_idx" ON "sip_audit_events" USING btree ("course_id");
    CREATE INDEX IF NOT EXISTS "sip_audit_events_updated_at_idx" ON "sip_audit_events" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "sip_audit_events_created_at_idx" ON "sip_audit_events" USING btree ("created_at");
    DO $$ BEGIN
      ALTER TABLE "sip_audit_events"
        ADD CONSTRAINT "sip_audit_events_course_id_courses_id_fk"
        FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "sip_dashboard" (
      "id" serial PRIMARY KEY NOT NULL,
      "profiles_count" numeric DEFAULT 0,
      "students_at_risk" numeric DEFAULT 0,
      "avg_imt" numeric DEFAULT 0,
      "avg_retention" numeric DEFAULT 0,
      "competency_distribution" jsonb,
      "recommendations_count" numeric DEFAULT 0,
      "evidence_count" numeric DEFAULT 0,
      "tutor_usage_sessions" numeric DEFAULT 0,
      "last_refresh_at" timestamp(3) with time zone,
      "last_activity_summary" varchar DEFAULT 'Sem atividade',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    INSERT INTO "sip_dashboard" ("id")
      SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM "sip_dashboard" WHERE "id" = 1);

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "sip_profiles_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "sip_evidence_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "sip_audit_events_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "sip_audit_events_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "sip_evidence_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "sip_profiles_id";
    DROP TABLE IF EXISTS "sip_dashboard" CASCADE;
    DROP TABLE IF EXISTS "sip_audit_events" CASCADE;
    DROP TABLE IF EXISTS "sip_evidence" CASCADE;
    DROP TABLE IF EXISTS "sip_profiles" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_sip_evidence_source_type";
  `);
}
