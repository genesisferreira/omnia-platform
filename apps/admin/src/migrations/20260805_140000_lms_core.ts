import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 02 — LMS Core (catálogo Payload nativo).
 * Collections: courses, course-modules, lessons, lesson-assets.
 * Não altera connector Moodle / lms_settings / identity links.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_courses_status" AS ENUM('draft','review','published','archived');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_courses_level" AS ENUM('beginner','intermediate','advanced');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_courses_visibility" AS ENUM('public','authenticated','company');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_lessons_type" AS ENUM('video','pdf','text','download','external_link');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_lesson_assets_asset_type" AS ENUM(
        'video','pdf','image','slides','attachment','zip','spreadsheet'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_courses_seo_schema_type" AS ENUM(
        'WebPage','Article','BlogPosting','Organization','LocalBusiness','Course','Event','FAQPage','Product'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "courses" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "short_description" varchar,
      "description" jsonb,
      "featured_image_id" integer,
      "thumbnail_id" integer,
      "instructor_id" integer,
      "owner_company_id" integer,
      "category" varchar,
      "level" "public"."enum_courses_level" DEFAULT 'beginner',
      "language" varchar DEFAULT 'pt-BR',
      "estimated_hours" numeric,
      "status" "public"."enum_courses_status" DEFAULT 'draft' NOT NULL,
      "published_at" timestamp(3) with time zone,
      "featured" boolean DEFAULT false,
      "visibility" "public"."enum_courses_visibility" DEFAULT 'public' NOT NULL,
      "seo_meta_title" varchar,
      "seo_meta_description" varchar,
      "seo_canonical_url" varchar,
      "seo_open_graph_image_id" integer,
      "seo_open_graph_title" varchar,
      "seo_open_graph_description" varchar,
      "seo_no_index" boolean DEFAULT false,
      "seo_no_follow" boolean DEFAULT false,
      "seo_schema_type" "public"."enum_courses_seo_schema_type",
      "seo_json_ld" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "courses_slug_idx" ON "courses" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "courses_title_idx" ON "courses" USING btree ("title");
    CREATE INDEX IF NOT EXISTS "courses_status_idx" ON "courses" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "courses_visibility_idx" ON "courses" USING btree ("visibility");
    CREATE INDEX IF NOT EXISTS "courses_category_idx" ON "courses" USING btree ("category");
    CREATE INDEX IF NOT EXISTS "courses_instructor_idx" ON "courses" USING btree ("instructor_id");
    CREATE INDEX IF NOT EXISTS "courses_owner_company_idx" ON "courses" USING btree ("owner_company_id");
    CREATE INDEX IF NOT EXISTS "courses_updated_at_idx" ON "courses" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "courses_created_at_idx" ON "courses" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "courses" ADD CONSTRAINT "courses_featured_image_id_media_id_fk"
        FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "courses" ADD CONSTRAINT "courses_thumbnail_id_media_id_fk"
        FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_users_id_fk"
        FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_company_id_companies_id_fk"
        FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "courses" ADD CONSTRAINT "courses_seo_open_graph_image_id_media_id_fk"
        FOREIGN KEY ("seo_open_graph_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "courses_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "courses_tags" ADD CONSTRAINT "courses_tags_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "courses_tags_order_idx" ON "courses_tags" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "courses_tags_parent_id_idx" ON "courses_tags" USING btree ("_parent_id");

    CREATE TABLE IF NOT EXISTS "courses_seo_keywords" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "keyword" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "courses_seo_keywords" ADD CONSTRAINT "courses_seo_keywords_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "courses_seo_keywords_order_idx" ON "courses_seo_keywords" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "courses_seo_keywords_parent_id_idx" ON "courses_seo_keywords" USING btree ("_parent_id");

    CREATE TABLE IF NOT EXISTS "course_modules" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "description" varchar,
      "order" numeric DEFAULT 1 NOT NULL,
      "course_id" integer NOT NULL,
      "published" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "course_modules_slug_idx" ON "course_modules" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "course_modules_title_idx" ON "course_modules" USING btree ("title");
    CREATE INDEX IF NOT EXISTS "course_modules_order_idx" ON "course_modules" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "course_modules_course_idx" ON "course_modules" USING btree ("course_id");
    CREATE INDEX IF NOT EXISTS "course_modules_published_idx" ON "course_modules" USING btree ("published");
    CREATE INDEX IF NOT EXISTS "course_modules_updated_at_idx" ON "course_modules" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "course_modules_created_at_idx" ON "course_modules" USING btree ("created_at");
    DO $$ BEGIN
      ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_courses_id_fk"
        FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "lessons" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "summary" varchar,
      "content" jsonb,
      "type" "public"."enum_lessons_type" DEFAULT 'text' NOT NULL,
      "external_url" varchar,
      "duration" numeric,
      "order" numeric DEFAULT 1 NOT NULL,
      "published" boolean DEFAULT false,
      "module_id" integer NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "lessons_slug_idx" ON "lessons" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "lessons_title_idx" ON "lessons" USING btree ("title");
    CREATE INDEX IF NOT EXISTS "lessons_type_idx" ON "lessons" USING btree ("type");
    CREATE INDEX IF NOT EXISTS "lessons_order_idx" ON "lessons" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "lessons_published_idx" ON "lessons" USING btree ("published");
    CREATE INDEX IF NOT EXISTS "lessons_module_idx" ON "lessons" USING btree ("module_id");
    CREATE INDEX IF NOT EXISTS "lessons_updated_at_idx" ON "lessons" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "lessons_created_at_idx" ON "lessons" USING btree ("created_at");
    DO $$ BEGIN
      ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_course_modules_id_fk"
        FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "lesson_assets" (
      "id" serial PRIMARY KEY NOT NULL,
      "lesson_id" integer NOT NULL,
      "media_id" integer NOT NULL,
      "asset_type" "public"."enum_lesson_assets_asset_type" DEFAULT 'attachment' NOT NULL,
      "title" varchar NOT NULL,
      "description" varchar,
      "order" numeric DEFAULT 1 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "lesson_assets_lesson_idx" ON "lesson_assets" USING btree ("lesson_id");
    CREATE INDEX IF NOT EXISTS "lesson_assets_media_idx" ON "lesson_assets" USING btree ("media_id");
    CREATE INDEX IF NOT EXISTS "lesson_assets_asset_type_idx" ON "lesson_assets" USING btree ("asset_type");
    CREATE INDEX IF NOT EXISTS "lesson_assets_order_idx" ON "lesson_assets" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "lesson_assets_updated_at_idx" ON "lesson_assets" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "lesson_assets_created_at_idx" ON "lesson_assets" USING btree ("created_at");
    DO $$ BEGIN
      ALTER TABLE "lesson_assets" ADD CONSTRAINT "lesson_assets_lesson_id_lessons_id_fk"
        FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "lesson_assets" ADD CONSTRAINT "lesson_assets_media_id_media_id_fk"
        FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "courses_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "course_modules_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "lessons_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "lesson_assets_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_courses_fk"
        FOREIGN KEY ("courses_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_course_modules_fk"
        FOREIGN KEY ("course_modules_id") REFERENCES "public"."course_modules"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_lessons_fk"
        FOREIGN KEY ("lessons_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_lesson_assets_fk"
        FOREIGN KEY ("lesson_assets_id") REFERENCES "public"."lesson_assets"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_courses_id_idx"
      ON "payload_locked_documents_rels" USING btree ("courses_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_course_modules_id_idx"
      ON "payload_locked_documents_rels" USING btree ("course_modules_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_lessons_id_idx"
      ON "payload_locked_documents_rels" USING btree ("lessons_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_lesson_assets_id_idx"
      ON "payload_locked_documents_rels" USING btree ("lesson_assets_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_lesson_assets_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_lessons_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_course_modules_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_courses_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_lesson_assets_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_lessons_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_course_modules_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_courses_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lesson_assets_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lessons_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "course_modules_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "courses_id";

    DROP TABLE IF EXISTS "lesson_assets" CASCADE;
    DROP TABLE IF EXISTS "lessons" CASCADE;
    DROP TABLE IF EXISTS "course_modules" CASCADE;
    DROP TABLE IF EXISTS "courses_seo_keywords" CASCADE;
    DROP TABLE IF EXISTS "courses_tags" CASCADE;
    DROP TABLE IF EXISTS "courses" CASCADE;

    DROP TYPE IF EXISTS "public"."enum_courses_seo_schema_type";
    DROP TYPE IF EXISTS "public"."enum_lesson_assets_asset_type";
    DROP TYPE IF EXISTS "public"."enum_lessons_type";
    DROP TYPE IF EXISTS "public"."enum_courses_visibility";
    DROP TYPE IF EXISTS "public"."enum_courses_level";
    DROP TYPE IF EXISTS "public"."enum_courses_status";
  `);
}
