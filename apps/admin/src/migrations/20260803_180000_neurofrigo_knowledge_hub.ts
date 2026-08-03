import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Neurofrigo Knowledge Hub Foundation (Macroentrega 01) — schema alinhado às collections/globals.
 *
 * Inclui: enums, tabelas, arrays, hasMany select, rels, FKs, drafts/versions (_v),
 * globals, payload_locked_documents_rels.
 *
 * Rollback: down() remove artefatos KH e remapeia papéis novos → editor.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- ── Roles ──────────────────────────────────────────────────────────────
    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE text USING "role"::text;
    DROP TYPE IF EXISTS "public"."enum_users_role";
    CREATE TYPE "public"."enum_users_role" AS ENUM(
      'super_admin',
      'admin',
      'editor',
      'neurofrigo_admin',
      'technical_reviewer',
      'partner',
      'instructor',
      'student',
      'client'
    );
    ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "public"."enum_users_role"
      USING ("role"::"public"."enum_users_role");
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."enum_users_role";

    -- ── Enums Knowledge Hub ────────────────────────────────────────────────
    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_categories_knowledge_area" AS ENUM(
        'refrigeracao','automacao','eletrica','eficiencia','seguranca','neurofrigo',
        'cursos','institucional','comercial','engenharia','marketing'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_sources_source_type" AS ENUM(
        'rich_text','markdown','txt','pdf','docx','image','external_link','blog_post',
        'course_ref','lesson_ref','technical_manual','apostila','procedure','standard','case_study'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_sources_reliability_level" AS ENUM(
        'low','medium','high','verified'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_sources_allowed_agents" AS ENUM(
        'concierge','tutor','refrigeration','neurofrigo-technology','electrical-controls',
        'evaluator','radar','projects-lab','content-production','commercial','support','command'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_documents_source_type" AS ENUM(
        'rich_text','markdown','txt','pdf','docx','image','external_link','blog_post',
        'course_ref','lesson_ref','technical_manual','apostila','procedure','standard','case_study'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_documents_knowledge_area" AS ENUM(
        'refrigeracao','automacao','eletrica','eficiencia','seguranca','neurofrigo',
        'cursos','institucional','comercial','engenharia','marketing'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_documents_status" AS ENUM(
        'draft','in_review','approved','processing','indexed','published','rejected',
        'archived','expired','processing_failed','suspended'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_documents_processing_status" AS ENUM(
        'idle','queued','running','succeeded','failed','not_implemented','controlled_mock'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_documents_publication_status" AS ENUM(
        'unpublished','published','archived'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_documents_security_classification" AS ENUM(
        'PUBLIC','CLIENT_PARTNER','STUDENT','TEACHER_MANAGER','INTERNAL_RESTRICTED'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_documents_allowed_agents" AS ENUM(
        'concierge','tutor','refrigeration','neurofrigo-technology','electrical-controls',
        'evaluator','radar','projects-lab','content-production','commercial','support','command'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_documents_technical_risk_level" AS ENUM(
        'low','medium','high','critical'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_documents_status_payload" AS ENUM('draft','published');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_reviews_decision" AS ENUM(
        'approved','rejected','needs_changes'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_processing_jobs_operation" AS ENUM(
        'extract','clean','classify','chunk','embed','index','deindex','reindex','archive'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_processing_jobs_status" AS ENUM(
        'idle','queued','running','succeeded','failed','not_implemented','controlled_mock'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_agent_access_agent_key" AS ENUM(
        'concierge','tutor','refrigeration','neurofrigo-technology','electrical-controls',
        'evaluator','radar','projects-lab','content-production','commercial','support','command'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_agent_access_allowed_classifications" AS ENUM(
        'PUBLIC','CLIENT_PARTNER','STUDENT','TEACHER_MANAGER','INTERNAL_RESTRICTED'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_agent_access_allowed_knowledge_areas" AS ENUM(
        'refrigeracao','automacao','eletrica','eficiencia','seguranca','neurofrigo',
        'cursos','institucional','comercial','engenharia','marketing'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_agent_access_allowed_source_types" AS ENUM(
        'rich_text','markdown','txt','pdf','docx','image','external_link','blog_post',
        'course_ref','lesson_ref','technical_manual','apostila','procedure','standard','case_study'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_neurofrigo_knowledge_settings_ingestion_mode" AS ENUM(
        'manual','assisted','automatic'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_neurofrigo_knowledge_settings_default_security_classification" AS ENUM(
        'PUBLIC','CLIENT_PARTNER','STUDENT','TEACHER_MANAGER','INTERNAL_RESTRICTED'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_neurofrigo_knowledge_settings_command_allowed_roles" AS ENUM(
        'super_admin','admin','neurofrigo_admin'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_neurofrigo_knowledge_settings_processing_mode" AS ENUM(
        'controlled','mock','disabled'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    -- Version enums (mirror of document selects)
    DO $$ BEGIN
      CREATE TYPE "public"."enum__knowledge_documents_v_version_source_type" AS ENUM(
        'rich_text','markdown','txt','pdf','docx','image','external_link','blog_post',
        'course_ref','lesson_ref','technical_manual','apostila','procedure','standard','case_study'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__knowledge_documents_v_version_knowledge_area" AS ENUM(
        'refrigeracao','automacao','eletrica','eficiencia','seguranca','neurofrigo',
        'cursos','institucional','comercial','engenharia','marketing'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__knowledge_documents_v_version_status" AS ENUM(
        'draft','in_review','approved','processing','indexed','published','rejected',
        'archived','expired','processing_failed','suspended'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__knowledge_documents_v_version_processing_status" AS ENUM(
        'idle','queued','running','succeeded','failed','not_implemented','controlled_mock'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__knowledge_documents_v_version_publication_status" AS ENUM(
        'unpublished','published','archived'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__knowledge_documents_v_version_security_classification" AS ENUM(
        'PUBLIC','CLIENT_PARTNER','STUDENT','TEACHER_MANAGER','INTERNAL_RESTRICTED'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__knowledge_documents_v_version_allowed_agents" AS ENUM(
        'concierge','tutor','refrigeration','neurofrigo-technology','electrical-controls',
        'evaluator','radar','projects-lab','content-production','commercial','support','command'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__knowledge_documents_v_version_technical_risk_level" AS ENUM(
        'low','medium','high','critical'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__knowledge_documents_v_version_status_payload" AS ENUM('draft','published');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    -- ── knowledge_categories ───────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS "knowledge_categories" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "description" varchar,
      "parent_id" integer,
      "knowledge_area" "public"."enum_knowledge_categories_knowledge_area",
      "active" boolean DEFAULT true,
      "sort_order" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_categories_slug_idx"
      ON "knowledge_categories" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "knowledge_categories_name_idx"
      ON "knowledge_categories" USING btree ("name");
    CREATE INDEX IF NOT EXISTS "knowledge_categories_knowledge_area_idx"
      ON "knowledge_categories" USING btree ("knowledge_area");
    CREATE INDEX IF NOT EXISTS "knowledge_categories_updated_at_idx"
      ON "knowledge_categories" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "knowledge_categories_created_at_idx"
      ON "knowledge_categories" USING btree ("created_at");
    DO $$ BEGIN
      ALTER TABLE "knowledge_categories"
        ADD CONSTRAINT "knowledge_categories_parent_id_knowledge_categories_id_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_categories"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    -- ── knowledge_sources ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS "knowledge_sources" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "source_type" "public"."enum_knowledge_sources_source_type" NOT NULL,
      "domain" varchar,
      "organization" varchar,
      "reliability_level" "public"."enum_knowledge_sources_reliability_level" DEFAULT 'medium' NOT NULL,
      "approved_for_web_research" boolean DEFAULT false,
      "active" boolean DEFAULT true,
      "notes" varchar,
      "last_reviewed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "knowledge_sources_name_idx"
      ON "knowledge_sources" USING btree ("name");
    CREATE INDEX IF NOT EXISTS "knowledge_sources_updated_at_idx"
      ON "knowledge_sources" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "knowledge_sources_created_at_idx"
      ON "knowledge_sources" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "knowledge_sources_allowed_agents" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "public"."enum_knowledge_sources_allowed_agents",
      "id" serial PRIMARY KEY NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "knowledge_sources_allowed_agents"
        ADD CONSTRAINT "knowledge_sources_allowed_agents_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_sources"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    -- ── knowledge_documents ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS "knowledge_documents" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "summary" varchar,
      "content" jsonb,
      "source_type" "public"."enum_knowledge_documents_source_type" DEFAULT 'rich_text' NOT NULL,
      "file_id" integer,
      "external_source_url" varchar,
      "language" varchar DEFAULT 'pt-BR',
      "owner_company_id" integer,
      "knowledge_area" "public"."enum_knowledge_documents_knowledge_area",
      "category_id" integer,
      "author_name" varchar,
      "reviewed_by_id" integer,
      "approved_by_id" integer,
      "status" "public"."enum_knowledge_documents_status" DEFAULT 'draft' NOT NULL,
      "processing_status" "public"."enum_knowledge_documents_processing_status" DEFAULT 'idle' NOT NULL,
      "publication_status" "public"."enum_knowledge_documents_publication_status" DEFAULT 'unpublished' NOT NULL,
      "security_classification" "public"."enum_knowledge_documents_security_classification" DEFAULT 'INTERNAL_RESTRICTED' NOT NULL,
      "allow_ai_use" boolean DEFAULT false,
      "allow_web_publication" boolean DEFAULT false,
      "allow_download" boolean DEFAULT false,
      "requires_enrollment" boolean DEFAULT false,
      "technical_risk_level" "public"."enum_knowledge_documents_technical_risk_level" DEFAULT 'high' NOT NULL,
      "human_review_required" boolean DEFAULT true,
      "version_number" varchar DEFAULT '1.0.0',
      "revision_notes" varchar,
      "supersedes_document_id" integer,
      "checksum" varchar,
      "source_date" timestamp(3) with time zone,
      "valid_from" timestamp(3) with time zone,
      "valid_until" timestamp(3) with time zone,
      "published_at" timestamp(3) with time zone,
      "archived_at" timestamp(3) with time zone,
      "last_indexed_at" timestamp(3) with time zone,
      "indexing_error" varchar,
      "created_by_id" integer,
      "updated_by_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "_status" "public"."enum_knowledge_documents_status_payload" DEFAULT 'draft'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_documents_slug_idx"
      ON "knowledge_documents" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_title_idx"
      ON "knowledge_documents" USING btree ("title");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_source_type_idx"
      ON "knowledge_documents" USING btree ("source_type");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_owner_company_idx"
      ON "knowledge_documents" USING btree ("owner_company_id");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_knowledge_area_idx"
      ON "knowledge_documents" USING btree ("knowledge_area");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_category_idx"
      ON "knowledge_documents" USING btree ("category_id");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_status_idx"
      ON "knowledge_documents" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_processing_status_idx"
      ON "knowledge_documents" USING btree ("processing_status");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_publication_status_idx"
      ON "knowledge_documents" USING btree ("publication_status");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_classification_idx"
      ON "knowledge_documents" USING btree ("security_classification");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_updated_at_idx"
      ON "knowledge_documents" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_created_at_idx"
      ON "knowledge_documents" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "knowledge_documents__status_idx"
      ON "knowledge_documents" USING btree ("_status");

    DO $$ BEGIN
      ALTER TABLE "knowledge_documents"
        ADD CONSTRAINT "knowledge_documents_file_id_media_id_fk"
        FOREIGN KEY ("file_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents"
        ADD CONSTRAINT "knowledge_documents_owner_company_id_companies_id_fk"
        FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents"
        ADD CONSTRAINT "knowledge_documents_category_id_knowledge_categories_id_fk"
        FOREIGN KEY ("category_id") REFERENCES "public"."knowledge_categories"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents"
        ADD CONSTRAINT "knowledge_documents_reviewed_by_id_users_id_fk"
        FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents"
        ADD CONSTRAINT "knowledge_documents_approved_by_id_users_id_fk"
        FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents"
        ADD CONSTRAINT "knowledge_documents_supersedes_document_id_knowledge_documents_id_fk"
        FOREIGN KEY ("supersedes_document_id") REFERENCES "public"."knowledge_documents"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents"
        ADD CONSTRAINT "knowledge_documents_created_by_id_users_id_fk"
        FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents"
        ADD CONSTRAINT "knowledge_documents_updated_by_id_users_id_fk"
        FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    -- Arrays
    CREATE TABLE IF NOT EXISTS "knowledge_documents_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents_tags"
        ADD CONSTRAINT "knowledge_documents_tags_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."knowledge_documents"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "knowledge_documents_tags_order_idx"
      ON "knowledge_documents_tags" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_tags_parent_id_idx"
      ON "knowledge_documents_tags" USING btree ("_parent_id");

    CREATE TABLE IF NOT EXISTS "knowledge_documents_allowed_roles" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "role" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents_allowed_roles"
        ADD CONSTRAINT "knowledge_documents_allowed_roles_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."knowledge_documents"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "knowledge_documents_allowed_roles_order_idx"
      ON "knowledge_documents_allowed_roles" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_allowed_roles_parent_id_idx"
      ON "knowledge_documents_allowed_roles" USING btree ("_parent_id");

    CREATE TABLE IF NOT EXISTS "knowledge_documents_allowed_courses" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "course_id" numeric NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents_allowed_courses"
        ADD CONSTRAINT "knowledge_documents_allowed_courses_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."knowledge_documents"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "knowledge_documents_allowed_courses_order_idx"
      ON "knowledge_documents_allowed_courses" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_allowed_courses_parent_id_idx"
      ON "knowledge_documents_allowed_courses" USING btree ("_parent_id");

    -- hasMany select
    CREATE TABLE IF NOT EXISTS "knowledge_documents_allowed_agents" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "public"."enum_knowledge_documents_allowed_agents",
      "id" serial PRIMARY KEY NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents_allowed_agents"
        ADD CONSTRAINT "knowledge_documents_allowed_agents_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_documents"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    -- hasMany relationships
    CREATE TABLE IF NOT EXISTS "knowledge_documents_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "knowledge_categories_id" integer,
      "companies_id" integer
    );
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents_rels"
        ADD CONSTRAINT "knowledge_documents_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_documents"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents_rels"
        ADD CONSTRAINT "knowledge_documents_rels_knowledge_categories_fk"
        FOREIGN KEY ("knowledge_categories_id") REFERENCES "public"."knowledge_categories"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_documents_rels"
        ADD CONSTRAINT "knowledge_documents_rels_companies_fk"
        FOREIGN KEY ("companies_id") REFERENCES "public"."companies"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "knowledge_documents_rels_order_idx"
      ON "knowledge_documents_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_rels_parent_idx"
      ON "knowledge_documents_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_rels_path_idx"
      ON "knowledge_documents_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_rels_knowledge_categories_id_idx"
      ON "knowledge_documents_rels" USING btree ("knowledge_categories_id");
    CREATE INDEX IF NOT EXISTS "knowledge_documents_rels_companies_id_idx"
      ON "knowledge_documents_rels" USING btree ("companies_id");

    -- ── Versions / drafts (_knowledge_documents_v) ─────────────────────────
    CREATE TABLE IF NOT EXISTS "_knowledge_documents_v" (
      "id" serial PRIMARY KEY NOT NULL,
      "parent_id" integer,
      "version_title" varchar,
      "version_slug" varchar,
      "version_summary" varchar,
      "version_content" jsonb,
      "version_source_type" "public"."enum__knowledge_documents_v_version_source_type" DEFAULT 'rich_text',
      "version_file_id" integer,
      "version_external_source_url" varchar,
      "version_language" varchar DEFAULT 'pt-BR',
      "version_owner_company_id" integer,
      "version_knowledge_area" "public"."enum__knowledge_documents_v_version_knowledge_area",
      "version_category_id" integer,
      "version_author_name" varchar,
      "version_reviewed_by_id" integer,
      "version_approved_by_id" integer,
      "version_status" "public"."enum__knowledge_documents_v_version_status" DEFAULT 'draft',
      "version_processing_status" "public"."enum__knowledge_documents_v_version_processing_status" DEFAULT 'idle',
      "version_publication_status" "public"."enum__knowledge_documents_v_version_publication_status" DEFAULT 'unpublished',
      "version_security_classification" "public"."enum__knowledge_documents_v_version_security_classification" DEFAULT 'INTERNAL_RESTRICTED',
      "version_allow_ai_use" boolean DEFAULT false,
      "version_allow_web_publication" boolean DEFAULT false,
      "version_allow_download" boolean DEFAULT false,
      "version_requires_enrollment" boolean DEFAULT false,
      "version_technical_risk_level" "public"."enum__knowledge_documents_v_version_technical_risk_level" DEFAULT 'high',
      "version_human_review_required" boolean DEFAULT true,
      "version_version_number" varchar DEFAULT '1.0.0',
      "version_revision_notes" varchar,
      "version_supersedes_document_id" integer,
      "version_checksum" varchar,
      "version_source_date" timestamp(3) with time zone,
      "version_valid_from" timestamp(3) with time zone,
      "version_valid_until" timestamp(3) with time zone,
      "version_published_at" timestamp(3) with time zone,
      "version_archived_at" timestamp(3) with time zone,
      "version_last_indexed_at" timestamp(3) with time zone,
      "version_indexing_error" varchar,
      "version_created_by_id" integer,
      "version_updated_by_id" integer,
      "version_updated_at" timestamp(3) with time zone,
      "version_created_at" timestamp(3) with time zone,
      "version__status" "public"."enum__knowledge_documents_v_version_status_payload" DEFAULT 'draft',
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "latest" boolean,
      "autosave" boolean
    );

    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v"
        ADD CONSTRAINT "_knowledge_documents_v_parent_id_knowledge_documents_id_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_documents"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v"
        ADD CONSTRAINT "_knowledge_documents_v_version_file_id_media_id_fk"
        FOREIGN KEY ("version_file_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v"
        ADD CONSTRAINT "_knowledge_documents_v_version_owner_company_id_companies_id_fk"
        FOREIGN KEY ("version_owner_company_id") REFERENCES "public"."companies"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v"
        ADD CONSTRAINT "_knowledge_documents_v_version_category_id_knowledge_categories_id_fk"
        FOREIGN KEY ("version_category_id") REFERENCES "public"."knowledge_categories"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v"
        ADD CONSTRAINT "_knowledge_documents_v_version_reviewed_by_id_users_id_fk"
        FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v"
        ADD CONSTRAINT "_knowledge_documents_v_version_approved_by_id_users_id_fk"
        FOREIGN KEY ("version_approved_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v"
        ADD CONSTRAINT "_knowledge_documents_v_version_supersedes_document_id_knowledge_documents_id_fk"
        FOREIGN KEY ("version_supersedes_document_id") REFERENCES "public"."knowledge_documents"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v"
        ADD CONSTRAINT "_knowledge_documents_v_version_created_by_id_users_id_fk"
        FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v"
        ADD CONSTRAINT "_knowledge_documents_v_version_updated_by_id_users_id_fk"
        FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "_knowledge_documents_v_parent_idx"
      ON "_knowledge_documents_v" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "_knowledge_documents_v_version_version_slug_idx"
      ON "_knowledge_documents_v" USING btree ("version_slug");
    CREATE INDEX IF NOT EXISTS "_knowledge_documents_v_version_version_status_idx"
      ON "_knowledge_documents_v" USING btree ("version_status");
    CREATE INDEX IF NOT EXISTS "_knowledge_documents_v_version_version__status_idx"
      ON "_knowledge_documents_v" USING btree ("version__status");
    CREATE INDEX IF NOT EXISTS "_knowledge_documents_v_created_at_idx"
      ON "_knowledge_documents_v" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "_knowledge_documents_v_updated_at_idx"
      ON "_knowledge_documents_v" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "_knowledge_documents_v_latest_idx"
      ON "_knowledge_documents_v" USING btree ("latest");
    CREATE INDEX IF NOT EXISTS "_knowledge_documents_v_autosave_idx"
      ON "_knowledge_documents_v" USING btree ("autosave");

    CREATE TABLE IF NOT EXISTS "_knowledge_documents_v_version_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "tag" varchar,
      "_uuid" varchar
    );
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v_version_tags"
        ADD CONSTRAINT "_knowledge_documents_v_version_tags_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."_knowledge_documents_v"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "_knowledge_documents_v_version_allowed_roles" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "role" varchar,
      "_uuid" varchar
    );
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v_version_allowed_roles"
        ADD CONSTRAINT "_knowledge_documents_v_version_allowed_roles_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."_knowledge_documents_v"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "_knowledge_documents_v_version_allowed_courses" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "course_id" numeric,
      "_uuid" varchar
    );
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v_version_allowed_courses"
        ADD CONSTRAINT "_knowledge_documents_v_version_allowed_courses_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."_knowledge_documents_v"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "_knowledge_documents_v_version_allowed_agents" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "public"."enum__knowledge_documents_v_version_allowed_agents",
      "id" serial PRIMARY KEY NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v_version_allowed_agents"
        ADD CONSTRAINT "_knowledge_documents_v_version_allowed_agents_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."_knowledge_documents_v"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "_knowledge_documents_v_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "knowledge_categories_id" integer,
      "companies_id" integer
    );
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v_rels"
        ADD CONSTRAINT "_knowledge_documents_v_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."_knowledge_documents_v"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v_rels"
        ADD CONSTRAINT "_knowledge_documents_v_rels_knowledge_categories_fk"
        FOREIGN KEY ("knowledge_categories_id") REFERENCES "public"."knowledge_categories"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "_knowledge_documents_v_rels"
        ADD CONSTRAINT "_knowledge_documents_v_rels_companies_fk"
        FOREIGN KEY ("companies_id") REFERENCES "public"."companies"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "_knowledge_documents_v_rels_order_idx"
      ON "_knowledge_documents_v_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "_knowledge_documents_v_rels_parent_idx"
      ON "_knowledge_documents_v_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "_knowledge_documents_v_rels_path_idx"
      ON "_knowledge_documents_v_rels" USING btree ("path");

    -- ── knowledge_reviews ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS "knowledge_reviews" (
      "id" serial PRIMARY KEY NOT NULL,
      "document_id" integer NOT NULL,
      "version" varchar,
      "reviewer_id" integer,
      "decision" "public"."enum_knowledge_reviews_decision" NOT NULL,
      "comments" varchar,
      "technical_validation" boolean DEFAULT false,
      "security_validation" boolean DEFAULT false,
      "pedagogical_validation" boolean DEFAULT false,
      "reviewed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "knowledge_reviews_document_idx"
      ON "knowledge_reviews" USING btree ("document_id");
    CREATE INDEX IF NOT EXISTS "knowledge_reviews_decision_idx"
      ON "knowledge_reviews" USING btree ("decision");
    CREATE INDEX IF NOT EXISTS "knowledge_reviews_updated_at_idx"
      ON "knowledge_reviews" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "knowledge_reviews_created_at_idx"
      ON "knowledge_reviews" USING btree ("created_at");
    DO $$ BEGIN
      ALTER TABLE "knowledge_reviews"
        ADD CONSTRAINT "knowledge_reviews_document_id_knowledge_documents_id_fk"
        FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_reviews"
        ADD CONSTRAINT "knowledge_reviews_reviewer_id_users_id_fk"
        FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    -- ── knowledge_processing_jobs ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS "knowledge_processing_jobs" (
      "id" serial PRIMARY KEY NOT NULL,
      "document_id" integer NOT NULL,
      "operation" "public"."enum_knowledge_processing_jobs_operation" NOT NULL,
      "status" "public"."enum_knowledge_processing_jobs_status" DEFAULT 'not_implemented' NOT NULL,
      "attempt" numeric DEFAULT 0,
      "provider" varchar DEFAULT 'none',
      "started_at" timestamp(3) with time zone,
      "finished_at" timestamp(3) with time zone,
      "error_code" varchar,
      "sanitized_error" varchar,
      "correlation_id" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "knowledge_processing_jobs_document_idx"
      ON "knowledge_processing_jobs" USING btree ("document_id");
    CREATE INDEX IF NOT EXISTS "knowledge_processing_jobs_operation_idx"
      ON "knowledge_processing_jobs" USING btree ("operation");
    CREATE INDEX IF NOT EXISTS "knowledge_processing_jobs_status_idx"
      ON "knowledge_processing_jobs" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "knowledge_processing_jobs_correlation_id_idx"
      ON "knowledge_processing_jobs" USING btree ("correlation_id");
    CREATE INDEX IF NOT EXISTS "knowledge_processing_jobs_updated_at_idx"
      ON "knowledge_processing_jobs" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "knowledge_processing_jobs_created_at_idx"
      ON "knowledge_processing_jobs" USING btree ("created_at");
    DO $$ BEGIN
      ALTER TABLE "knowledge_processing_jobs"
        ADD CONSTRAINT "knowledge_processing_jobs_document_id_knowledge_documents_id_fk"
        FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    -- ── knowledge_audit_events ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS "knowledge_audit_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "actor" varchar NOT NULL,
      "action" varchar NOT NULL,
      "entity_type" varchar NOT NULL,
      "entity_id" varchar,
      "previous_state" jsonb,
      "next_state" jsonb,
      "reason" varchar,
      "correlation_id" varchar,
      "environment" varchar,
      "event_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "knowledge_audit_events_actor_idx"
      ON "knowledge_audit_events" USING btree ("actor");
    CREATE INDEX IF NOT EXISTS "knowledge_audit_events_action_idx"
      ON "knowledge_audit_events" USING btree ("action");
    CREATE INDEX IF NOT EXISTS "knowledge_audit_events_entity_type_idx"
      ON "knowledge_audit_events" USING btree ("entity_type");
    CREATE INDEX IF NOT EXISTS "knowledge_audit_events_entity_id_idx"
      ON "knowledge_audit_events" USING btree ("entity_id");
    CREATE INDEX IF NOT EXISTS "knowledge_audit_events_correlation_id_idx"
      ON "knowledge_audit_events" USING btree ("correlation_id");
    CREATE INDEX IF NOT EXISTS "knowledge_audit_events_event_at_idx"
      ON "knowledge_audit_events" USING btree ("event_at");
    CREATE INDEX IF NOT EXISTS "knowledge_audit_events_updated_at_idx"
      ON "knowledge_audit_events" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "knowledge_audit_events_created_at_idx"
      ON "knowledge_audit_events" USING btree ("created_at");

    -- ── knowledge_agent_access ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS "knowledge_agent_access" (
      "id" serial PRIMARY KEY NOT NULL,
      "agent_key" "public"."enum_knowledge_agent_access_agent_key" NOT NULL,
      "display_name" varchar NOT NULL,
      "can_use_web_research" boolean DEFAULT false,
      "can_use_unpublished" boolean DEFAULT false,
      "active" boolean DEFAULT true,
      "seed_notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_agent_access_agent_key_idx"
      ON "knowledge_agent_access" USING btree ("agent_key");
    CREATE INDEX IF NOT EXISTS "knowledge_agent_access_updated_at_idx"
      ON "knowledge_agent_access" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "knowledge_agent_access_created_at_idx"
      ON "knowledge_agent_access" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "knowledge_agent_access_allowed_classifications" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "public"."enum_knowledge_agent_access_allowed_classifications",
      "id" serial PRIMARY KEY NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "knowledge_agent_access_allowed_classifications"
        ADD CONSTRAINT "knowledge_agent_access_allowed_classifications_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_agent_access"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "knowledge_agent_access_allowed_knowledge_areas" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "public"."enum_knowledge_agent_access_allowed_knowledge_areas",
      "id" serial PRIMARY KEY NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "knowledge_agent_access_allowed_knowledge_areas"
        ADD CONSTRAINT "knowledge_agent_access_allowed_knowledge_areas_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_agent_access"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "knowledge_agent_access_allowed_source_types" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "public"."enum_knowledge_agent_access_allowed_source_types",
      "id" serial PRIMARY KEY NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "knowledge_agent_access_allowed_source_types"
        ADD CONSTRAINT "knowledge_agent_access_allowed_source_types_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_agent_access"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "knowledge_agent_access_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "knowledge_categories_id" integer
    );
    DO $$ BEGIN
      ALTER TABLE "knowledge_agent_access_rels"
        ADD CONSTRAINT "knowledge_agent_access_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_agent_access"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "knowledge_agent_access_rels"
        ADD CONSTRAINT "knowledge_agent_access_rels_knowledge_categories_fk"
        FOREIGN KEY ("knowledge_categories_id") REFERENCES "public"."knowledge_categories"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "knowledge_agent_access_rels_order_idx"
      ON "knowledge_agent_access_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "knowledge_agent_access_rels_parent_idx"
      ON "knowledge_agent_access_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "knowledge_agent_access_rels_path_idx"
      ON "knowledge_agent_access_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "knowledge_agent_access_rels_knowledge_categories_id_idx"
      ON "knowledge_agent_access_rels" USING btree ("knowledge_categories_id");

    -- ── Globals ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS "neurofrigo_knowledge_settings" (
      "id" serial PRIMARY KEY NOT NULL,
      "knowledge_hub_enabled" boolean DEFAULT true,
      "ingestion_mode" "public"."enum_neurofrigo_knowledge_settings_ingestion_mode" DEFAULT 'manual' NOT NULL,
      "require_human_approval" boolean DEFAULT true,
      "default_security_classification" "public"."enum_neurofrigo_knowledge_settings_default_security_classification" DEFAULT 'INTERNAL_RESTRICTED',
      "default_language" varchar DEFAULT 'pt-BR',
      "default_validity_days" numeric DEFAULT 365,
      "allow_web_research" boolean DEFAULT false,
      "allow_automatic_promotion_from_web" boolean DEFAULT false,
      "max_upload_size" numeric DEFAULT 26214400,
      "future_embedding_provider" varchar DEFAULT 'deepseek',
      "future_vector_store" varchar DEFAULT 'placeholder',
      "processing_mode" "public"."enum_neurofrigo_knowledge_settings_processing_mode" DEFAULT 'controlled' NOT NULL,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    CREATE TABLE IF NOT EXISTS "neurofrigo_knowledge_settings_command_allowed_roles" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "public"."enum_neurofrigo_knowledge_settings_command_allowed_roles",
      "id" serial PRIMARY KEY NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "neurofrigo_knowledge_settings_command_allowed_roles"
        ADD CONSTRAINT "neurofrigo_knowledge_settings_command_allowed_roles_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."neurofrigo_knowledge_settings"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "neurofrigo_knowledge_settings_allowed_file_types" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "mime" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "neurofrigo_knowledge_settings_allowed_file_types"
        ADD CONSTRAINT "neurofrigo_knowledge_settings_allowed_file_types_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."neurofrigo_knowledge_settings"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "neurofrigo_knowledge_dashboard" (
      "id" serial PRIMARY KEY NOT NULL,
      "placeholder_note" varchar,
      "total_documents" numeric DEFAULT 0,
      "draft_count" numeric DEFAULT 0,
      "in_review_count" numeric DEFAULT 0,
      "approved_count" numeric DEFAULT 0,
      "published_count" numeric DEFAULT 0,
      "expired_count" numeric DEFAULT 0,
      "processing_error_count" numeric DEFAULT 0,
      "pending_reviews_count" numeric DEFAULT 0,
      "documents_by_classification" varchar,
      "documents_by_company" varchar,
      "documents_by_area" varchar,
      "last_activity_summary" varchar,
      "future_cost_placeholder" varchar,
      "future_token_placeholder" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    -- ── payload_locked_documents_rels ──────────────────────────────────────
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "knowledge_categories_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "knowledge_sources_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "knowledge_documents_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "knowledge_reviews_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "knowledge_processing_jobs_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "knowledge_audit_events_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "knowledge_agent_access_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_knowledge_categories_fk"
        FOREIGN KEY ("knowledge_categories_id") REFERENCES "public"."knowledge_categories"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_knowledge_sources_fk"
        FOREIGN KEY ("knowledge_sources_id") REFERENCES "public"."knowledge_sources"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_knowledge_documents_fk"
        FOREIGN KEY ("knowledge_documents_id") REFERENCES "public"."knowledge_documents"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_knowledge_reviews_fk"
        FOREIGN KEY ("knowledge_reviews_id") REFERENCES "public"."knowledge_reviews"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_knowledge_processing_jobs_fk"
        FOREIGN KEY ("knowledge_processing_jobs_id") REFERENCES "public"."knowledge_processing_jobs"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_knowledge_audit_events_fk"
        FOREIGN KEY ("knowledge_audit_events_id") REFERENCES "public"."knowledge_audit_events"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_knowledge_agent_access_fk"
        FOREIGN KEY ("knowledge_agent_access_id") REFERENCES "public"."knowledge_agent_access"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_knowledge_categories_id_idx"
      ON "payload_locked_documents_rels" USING btree ("knowledge_categories_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_knowledge_sources_id_idx"
      ON "payload_locked_documents_rels" USING btree ("knowledge_sources_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_knowledge_documents_id_idx"
      ON "payload_locked_documents_rels" USING btree ("knowledge_documents_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_knowledge_reviews_id_idx"
      ON "payload_locked_documents_rels" USING btree ("knowledge_reviews_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_knowledge_processing_jobs_id_idx"
      ON "payload_locked_documents_rels" USING btree ("knowledge_processing_jobs_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_knowledge_audit_events_id_idx"
      ON "payload_locked_documents_rels" USING btree ("knowledge_audit_events_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_knowledge_agent_access_id_idx"
      ON "payload_locked_documents_rels" USING btree ("knowledge_agent_access_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_knowledge_agent_access_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_knowledge_audit_events_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_knowledge_processing_jobs_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_knowledge_reviews_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_knowledge_documents_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_knowledge_sources_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_knowledge_categories_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_knowledge_agent_access_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_knowledge_audit_events_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_knowledge_processing_jobs_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_knowledge_reviews_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_knowledge_documents_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_knowledge_sources_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_knowledge_categories_id_idx";

    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "knowledge_agent_access_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "knowledge_audit_events_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "knowledge_processing_jobs_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "knowledge_reviews_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "knowledge_documents_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "knowledge_sources_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "knowledge_categories_id";

    DROP TABLE IF EXISTS "neurofrigo_knowledge_settings_allowed_file_types" CASCADE;
    DROP TABLE IF EXISTS "neurofrigo_knowledge_settings_command_allowed_roles" CASCADE;
    DROP TABLE IF EXISTS "neurofrigo_knowledge_dashboard" CASCADE;
    DROP TABLE IF EXISTS "neurofrigo_knowledge_settings" CASCADE;

    DROP TABLE IF EXISTS "knowledge_agent_access_rels" CASCADE;
    DROP TABLE IF EXISTS "knowledge_agent_access_allowed_source_types" CASCADE;
    DROP TABLE IF EXISTS "knowledge_agent_access_allowed_knowledge_areas" CASCADE;
    DROP TABLE IF EXISTS "knowledge_agent_access_allowed_classifications" CASCADE;
    DROP TABLE IF EXISTS "knowledge_agent_access" CASCADE;
    DROP TABLE IF EXISTS "knowledge_audit_events" CASCADE;
    DROP TABLE IF EXISTS "knowledge_processing_jobs" CASCADE;
    DROP TABLE IF EXISTS "knowledge_reviews" CASCADE;

    DROP TABLE IF EXISTS "_knowledge_documents_v_rels" CASCADE;
    DROP TABLE IF EXISTS "_knowledge_documents_v_version_allowed_agents" CASCADE;
    DROP TABLE IF EXISTS "_knowledge_documents_v_version_allowed_courses" CASCADE;
    DROP TABLE IF EXISTS "_knowledge_documents_v_version_allowed_roles" CASCADE;
    DROP TABLE IF EXISTS "_knowledge_documents_v_version_tags" CASCADE;
    DROP TABLE IF EXISTS "_knowledge_documents_v" CASCADE;

    DROP TABLE IF EXISTS "knowledge_documents_rels" CASCADE;
    DROP TABLE IF EXISTS "knowledge_documents_allowed_agents" CASCADE;
    DROP TABLE IF EXISTS "knowledge_documents_allowed_courses" CASCADE;
    DROP TABLE IF EXISTS "knowledge_documents_allowed_roles" CASCADE;
    DROP TABLE IF EXISTS "knowledge_documents_tags" CASCADE;
    DROP TABLE IF EXISTS "knowledge_documents" CASCADE;

    DROP TABLE IF EXISTS "knowledge_sources_allowed_agents" CASCADE;
    DROP TABLE IF EXISTS "knowledge_sources" CASCADE;
    DROP TABLE IF EXISTS "knowledge_categories" CASCADE;

    UPDATE "users"
    SET "role" = 'editor'
    WHERE "role"::text IN ('neurofrigo_admin', 'technical_reviewer');

    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE text USING "role"::text;
    DROP TYPE IF EXISTS "public"."enum_users_role";
    CREATE TYPE "public"."enum_users_role" AS ENUM(
      'super_admin',
      'admin',
      'editor',
      'partner',
      'instructor',
      'student',
      'client'
    );
    ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "public"."enum_users_role"
      USING ("role"::"public"."enum_users_role");
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."enum_users_role";
  `);
}
