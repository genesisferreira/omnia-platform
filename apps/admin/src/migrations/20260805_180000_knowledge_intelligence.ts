import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 03 — Knowledge Intelligence (fábrica de conhecimento).
 * Collections: learning-resources, knowledge-chunks, embedding-queue, ki-processing-runs.
 * Global: ki-intelligence-dashboard.
 * Sem embeddings / Runtime / Chat.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_learning_resources_resource_type" AS ENUM(
        'pdf','txt','markdown','docx','pptx','html','video_transcript','ocr'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_learning_resources_origin" AS ENUM(
        'lms_lesson_asset','manual','upload'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_learning_resources_processing_status" AS ENUM(
        'pending','extracting','normalizing','chunking','indexing_hub','queued','completed','failed'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_embedding_queue_status" AS ENUM(
        'pending','processing','completed','failed'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_ki_processing_runs_status" AS ENUM(
        'pending','running','completed','failed'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "learning_resources" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "media_id" integer NOT NULL,
      "lesson_asset_id" integer,
      "lesson_id" integer,
      "module_id" integer,
      "course_id" integer,
      "resource_type" "public"."enum_learning_resources_resource_type" NOT NULL,
      "version" varchar DEFAULT '1.0.0',
      "language" varchar DEFAULT 'pt-BR',
      "author" varchar,
      "license" varchar DEFAULT 'internal',
      "origin" "public"."enum_learning_resources_origin" DEFAULT 'manual' NOT NULL,
      "file_hash" varchar,
      "processing_status" "public"."enum_learning_resources_processing_status" DEFAULT 'pending' NOT NULL,
      "auto_process" boolean DEFAULT true,
      "owner_company_id" integer,
      "instructor_id" integer,
      "category" varchar,
      "extracted_text" varchar,
      "extract_meta" jsonb,
      "normalized_text" varchar,
      "knowledge_document_id" integer,
      "last_error" varchar,
      "processed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "learning_resources_title_idx" ON "learning_resources" USING btree ("title");
    CREATE INDEX IF NOT EXISTS "learning_resources_media_idx" ON "learning_resources" USING btree ("media_id");
    CREATE INDEX IF NOT EXISTS "learning_resources_lesson_asset_idx" ON "learning_resources" USING btree ("lesson_asset_id");
    CREATE INDEX IF NOT EXISTS "learning_resources_lesson_idx" ON "learning_resources" USING btree ("lesson_id");
    CREATE INDEX IF NOT EXISTS "learning_resources_module_idx" ON "learning_resources" USING btree ("module_id");
    CREATE INDEX IF NOT EXISTS "learning_resources_course_idx" ON "learning_resources" USING btree ("course_id");
    CREATE INDEX IF NOT EXISTS "learning_resources_resource_type_idx" ON "learning_resources" USING btree ("resource_type");
    CREATE INDEX IF NOT EXISTS "learning_resources_file_hash_idx" ON "learning_resources" USING btree ("file_hash");
    CREATE INDEX IF NOT EXISTS "learning_resources_processing_status_idx" ON "learning_resources" USING btree ("processing_status");
    CREATE INDEX IF NOT EXISTS "learning_resources_owner_company_idx" ON "learning_resources" USING btree ("owner_company_id");
    CREATE INDEX IF NOT EXISTS "learning_resources_instructor_idx" ON "learning_resources" USING btree ("instructor_id");
    CREATE INDEX IF NOT EXISTS "learning_resources_knowledge_document_idx" ON "learning_resources" USING btree ("knowledge_document_id");
    CREATE INDEX IF NOT EXISTS "learning_resources_updated_at_idx" ON "learning_resources" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "learning_resources_created_at_idx" ON "learning_resources" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_media_id_media_id_fk"
        FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_lesson_asset_id_lesson_assets_id_fk"
        FOREIGN KEY ("lesson_asset_id") REFERENCES "public"."lesson_assets"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_lesson_id_lessons_id_fk"
        FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_module_id_course_modules_id_fk"
        FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_course_id_courses_id_fk"
        FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_owner_company_id_companies_id_fk"
        FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_instructor_id_users_id_fk"
        FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_knowledge_document_id_knowledge_documents_id_fk"
        FOREIGN KEY ("knowledge_document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "learning_resources_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "learning_resources_tags" ADD CONSTRAINT "learning_resources_tags_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."learning_resources"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "learning_resources_tags_order_idx" ON "learning_resources_tags" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "learning_resources_tags_parent_id_idx" ON "learning_resources_tags" USING btree ("_parent_id");

    CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
      "id" serial PRIMARY KEY NOT NULL,
      "learning_resource_id" integer NOT NULL,
      "knowledge_document_id" integer,
      "chunk_index" numeric NOT NULL,
      "chunk_text" varchar NOT NULL,
      "token_estimate" numeric NOT NULL,
      "start_offset" numeric NOT NULL,
      "end_offset" numeric NOT NULL,
      "course_id" integer,
      "module_id" integer,
      "lesson_id" integer,
      "owner_company_id" integer,
      "instructor_id" integer,
      "language" varchar,
      "version" varchar,
      "category" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "knowledge_chunks_learning_resource_idx" ON "knowledge_chunks" USING btree ("learning_resource_id");
    CREATE INDEX IF NOT EXISTS "knowledge_chunks_knowledge_document_idx" ON "knowledge_chunks" USING btree ("knowledge_document_id");
    CREATE INDEX IF NOT EXISTS "knowledge_chunks_chunk_index_idx" ON "knowledge_chunks" USING btree ("chunk_index");
    CREATE INDEX IF NOT EXISTS "knowledge_chunks_course_idx" ON "knowledge_chunks" USING btree ("course_id");
    CREATE INDEX IF NOT EXISTS "knowledge_chunks_module_idx" ON "knowledge_chunks" USING btree ("module_id");
    CREATE INDEX IF NOT EXISTS "knowledge_chunks_lesson_idx" ON "knowledge_chunks" USING btree ("lesson_id");
    CREATE INDEX IF NOT EXISTS "knowledge_chunks_owner_company_idx" ON "knowledge_chunks" USING btree ("owner_company_id");
    CREATE INDEX IF NOT EXISTS "knowledge_chunks_instructor_idx" ON "knowledge_chunks" USING btree ("instructor_id");
    CREATE INDEX IF NOT EXISTS "knowledge_chunks_updated_at_idx" ON "knowledge_chunks" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "knowledge_chunks_created_at_idx" ON "knowledge_chunks" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_learning_resource_id_learning_resources_id_fk"
        FOREIGN KEY ("learning_resource_id") REFERENCES "public"."learning_resources"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_knowledge_document_id_knowledge_documents_id_fk"
        FOREIGN KEY ("knowledge_document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_course_id_courses_id_fk"
        FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_module_id_course_modules_id_fk"
        FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_lesson_id_lessons_id_fk"
        FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_owner_company_id_companies_id_fk"
        FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_instructor_id_users_id_fk"
        FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "knowledge_chunks_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "knowledge_chunks_tags" ADD CONSTRAINT "knowledge_chunks_tags_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."knowledge_chunks"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "knowledge_chunks_tags_order_idx" ON "knowledge_chunks_tags" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "knowledge_chunks_tags_parent_id_idx" ON "knowledge_chunks_tags" USING btree ("_parent_id");

    CREATE TABLE IF NOT EXISTS "embedding_queue" (
      "id" serial PRIMARY KEY NOT NULL,
      "learning_resource_id" integer NOT NULL,
      "knowledge_document_id" integer,
      "chunk_id" integer,
      "status" "public"."enum_embedding_queue_status" DEFAULT 'pending' NOT NULL,
      "attempts" numeric DEFAULT 0,
      "provider" varchar DEFAULT 'none',
      "last_error" varchar,
      "scheduled_at" timestamp(3) with time zone,
      "completed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "embedding_queue_learning_resource_idx" ON "embedding_queue" USING btree ("learning_resource_id");
    CREATE INDEX IF NOT EXISTS "embedding_queue_knowledge_document_idx" ON "embedding_queue" USING btree ("knowledge_document_id");
    CREATE INDEX IF NOT EXISTS "embedding_queue_chunk_idx" ON "embedding_queue" USING btree ("chunk_id");
    CREATE INDEX IF NOT EXISTS "embedding_queue_status_idx" ON "embedding_queue" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "embedding_queue_updated_at_idx" ON "embedding_queue" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "embedding_queue_created_at_idx" ON "embedding_queue" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "embedding_queue" ADD CONSTRAINT "embedding_queue_learning_resource_id_learning_resources_id_fk"
        FOREIGN KEY ("learning_resource_id") REFERENCES "public"."learning_resources"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "embedding_queue" ADD CONSTRAINT "embedding_queue_knowledge_document_id_knowledge_documents_id_fk"
        FOREIGN KEY ("knowledge_document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "embedding_queue" ADD CONSTRAINT "embedding_queue_chunk_id_knowledge_chunks_id_fk"
        FOREIGN KEY ("chunk_id") REFERENCES "public"."knowledge_chunks"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "ki_processing_runs" (
      "id" serial PRIMARY KEY NOT NULL,
      "learning_resource_id" integer NOT NULL,
      "status" "public"."enum_ki_processing_runs_status" DEFAULT 'pending' NOT NULL,
      "stages" jsonb,
      "chunk_count" numeric DEFAULT 0,
      "correlation_id" varchar,
      "error_code" varchar,
      "sanitized_error" varchar,
      "started_at" timestamp(3) with time zone,
      "finished_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "ki_processing_runs_learning_resource_idx" ON "ki_processing_runs" USING btree ("learning_resource_id");
    CREATE INDEX IF NOT EXISTS "ki_processing_runs_status_idx" ON "ki_processing_runs" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "ki_processing_runs_correlation_id_idx" ON "ki_processing_runs" USING btree ("correlation_id");
    CREATE INDEX IF NOT EXISTS "ki_processing_runs_updated_at_idx" ON "ki_processing_runs" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "ki_processing_runs_created_at_idx" ON "ki_processing_runs" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "ki_processing_runs" ADD CONSTRAINT "ki_processing_runs_learning_resource_id_learning_resources_id_fk"
        FOREIGN KEY ("learning_resource_id") REFERENCES "public"."learning_resources"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "ki_intelligence_dashboard" (
      "id" serial PRIMARY KEY NOT NULL,
      "files_count" numeric DEFAULT 0,
      "processed_count" numeric DEFAULT 0,
      "pending_count" numeric DEFAULT 0,
      "failed_count" numeric DEFAULT 0,
      "chunks_count" numeric DEFAULT 0,
      "queue_pending_count" numeric DEFAULT 0,
      "last_refresh_at" timestamp(3) with time zone,
      "last_activity_summary" varchar,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "learning_resources_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "knowledge_chunks_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "embedding_queue_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "ki_processing_runs_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_learning_resources_fk"
        FOREIGN KEY ("learning_resources_id") REFERENCES "public"."learning_resources"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_knowledge_chunks_fk"
        FOREIGN KEY ("knowledge_chunks_id") REFERENCES "public"."knowledge_chunks"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_embedding_queue_fk"
        FOREIGN KEY ("embedding_queue_id") REFERENCES "public"."embedding_queue"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_ki_processing_runs_fk"
        FOREIGN KEY ("ki_processing_runs_id") REFERENCES "public"."ki_processing_runs"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_learning_resources_id_idx"
      ON "payload_locked_documents_rels" USING btree ("learning_resources_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_knowledge_chunks_id_idx"
      ON "payload_locked_documents_rels" USING btree ("knowledge_chunks_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_embedding_queue_id_idx"
      ON "payload_locked_documents_rels" USING btree ("embedding_queue_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_ki_processing_runs_id_idx"
      ON "payload_locked_documents_rels" USING btree ("ki_processing_runs_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_ki_processing_runs_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_embedding_queue_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_knowledge_chunks_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_learning_resources_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_ki_processing_runs_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_embedding_queue_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_knowledge_chunks_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_learning_resources_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ki_processing_runs_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "embedding_queue_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "knowledge_chunks_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "learning_resources_id";

    DROP TABLE IF EXISTS "ki_intelligence_dashboard" CASCADE;
    DROP TABLE IF EXISTS "ki_processing_runs" CASCADE;
    DROP TABLE IF EXISTS "embedding_queue" CASCADE;
    DROP TABLE IF EXISTS "knowledge_chunks_tags" CASCADE;
    DROP TABLE IF EXISTS "knowledge_chunks" CASCADE;
    DROP TABLE IF EXISTS "learning_resources_tags" CASCADE;
    DROP TABLE IF EXISTS "learning_resources" CASCADE;

    DROP TYPE IF EXISTS "public"."enum_ki_processing_runs_status";
    DROP TYPE IF EXISTS "public"."enum_embedding_queue_status";
    DROP TYPE IF EXISTS "public"."enum_learning_resources_processing_status";
    DROP TYPE IF EXISTS "public"."enum_learning_resources_origin";
    DROP TYPE IF EXISTS "public"."enum_learning_resources_resource_type";
  `);
}
