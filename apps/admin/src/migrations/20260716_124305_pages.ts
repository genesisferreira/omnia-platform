import { sql } from '@payloadcms/db-postgres'
import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_hero_variant" AS ENUM('default', 'compact', 'emphasis');
  CREATE TYPE "public"."enum_pages_blocks_features_items_icon_key" AS ENUM('multiempresa', 'cms', 'design', 'education', 'engineering', 'technology', 'services');
  CREATE TYPE "public"."enum_pages_blocks_features_columns" AS ENUM('1', '2', '3');
  CREATE TYPE "public"."enum_pages_blocks_companies_layout" AS ENUM('grid', 'list');
  CREATE TYPE "public"."enum_pages_page_type" AS ENUM('home', 'standard');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_hero_variant" AS ENUM('default', 'compact', 'emphasis');
  CREATE TYPE "public"."enum__pages_v_blocks_features_items_icon_key" AS ENUM('multiempresa', 'cms', 'design', 'education', 'engineering', 'technology', 'services');
  CREATE TYPE "public"."enum__pages_v_blocks_features_columns" AS ENUM('1', '2', '3');
  CREATE TYPE "public"."enum__pages_v_blocks_companies_layout" AS ENUM('grid', 'list');
  CREATE TYPE "public"."enum__pages_v_version_page_type" AS ENUM('home', 'standard');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "pages_blocks_hero" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"_path" text NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"eyebrow" varchar,
	"title" varchar,
	"subtitle" varchar,
	"primary_action_label" varchar,
	"primary_action_href" varchar,
	"secondary_action_label" varchar,
	"secondary_action_href" varchar,
	"variant" "enum_pages_blocks_hero_variant" DEFAULT 'default',
	"block_name" varchar
  );

  CREATE TABLE "pages_blocks_features_items" (
	"_order" integer NOT NULL,
	"_parent_id" varchar NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"title" varchar,
	"description" varchar,
	"icon_key" "enum_pages_blocks_features_items_icon_key"
  );

  CREATE TABLE "pages_blocks_features" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"_path" text NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"title" varchar,
	"subtitle" varchar,
	"columns" "enum_pages_blocks_features_columns" DEFAULT '3',
	"block_name" varchar
  );

  CREATE TABLE "pages_blocks_companies" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"_path" text NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"title" varchar,
	"subtitle" varchar,
	"limit" numeric DEFAULT 6,
	"show_role" boolean DEFAULT true,
	"show_description" boolean DEFAULT true,
	"layout" "enum_pages_blocks_companies_layout" DEFAULT 'grid',
	"block_name" varchar
  );

  CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"title" varchar,
	"slug" varchar,
	"page_type" "enum_pages_page_type" DEFAULT 'standard',
	"seo_meta_title" varchar,
	"seo_meta_description" varchar,
	"seo_canonical_url" varchar,
	"seo_no_index" boolean DEFAULT false,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"_status" "enum_pages_status" DEFAULT 'draft'
  );

  CREATE TABLE "_pages_v_blocks_hero" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"_path" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"eyebrow" varchar,
	"title" varchar,
	"subtitle" varchar,
	"primary_action_label" varchar,
	"primary_action_href" varchar,
	"secondary_action_label" varchar,
	"secondary_action_href" varchar,
	"variant" "enum__pages_v_blocks_hero_variant" DEFAULT 'default',
	"_uuid" varchar,
	"block_name" varchar
  );

  CREATE TABLE "_pages_v_blocks_features_items" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar,
	"description" varchar,
	"icon_key" "enum__pages_v_blocks_features_items_icon_key",
	"_uuid" varchar
  );

  CREATE TABLE "_pages_v_blocks_features" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"_path" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar,
	"subtitle" varchar,
	"columns" "enum__pages_v_blocks_features_columns" DEFAULT '3',
	"_uuid" varchar,
	"block_name" varchar
  );

  CREATE TABLE "_pages_v_blocks_companies" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"_path" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar,
	"subtitle" varchar,
	"limit" numeric DEFAULT 6,
	"show_role" boolean DEFAULT true,
	"show_description" boolean DEFAULT true,
	"layout" "enum__pages_v_blocks_companies_layout" DEFAULT 'grid',
	"_uuid" varchar,
	"block_name" varchar
  );

  CREATE TABLE "_pages_v" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"version_site_id" integer,
	"version_title" varchar,
	"version_slug" varchar,
	"version_page_type" "enum__pages_v_version_page_type" DEFAULT 'standard',
	"version_seo_meta_title" varchar,
	"version_seo_meta_description" varchar,
	"version_seo_canonical_url" varchar,
	"version_seo_no_index" boolean DEFAULT false,
	"version_updated_at" timestamp(3) with time zone,
	"version_created_at" timestamp(3) with time zone,
	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"latest" boolean,
	"autosave" boolean
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_features_items" ADD CONSTRAINT "pages_blocks_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_features" ADD CONSTRAINT "pages_blocks_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_companies" ADD CONSTRAINT "pages_blocks_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_features_items" ADD CONSTRAINT "_pages_v_blocks_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_features" ADD CONSTRAINT "_pages_v_blocks_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_companies" ADD CONSTRAINT "_pages_v_blocks_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_site_id_sites_id_fk" FOREIGN KEY ("version_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_features_items_order_idx" ON "pages_blocks_features_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_features_items_parent_id_idx" ON "pages_blocks_features_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_features_order_idx" ON "pages_blocks_features" USING btree ("_order");
  CREATE INDEX "pages_blocks_features_parent_id_idx" ON "pages_blocks_features" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_features_path_idx" ON "pages_blocks_features" USING btree ("_path");
  CREATE INDEX "pages_blocks_companies_order_idx" ON "pages_blocks_companies" USING btree ("_order");
  CREATE INDEX "pages_blocks_companies_parent_id_idx" ON "pages_blocks_companies" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_companies_path_idx" ON "pages_blocks_companies" USING btree ("_path");
  CREATE INDEX "pages_site_idx" ON "pages" USING btree ("site_id");
  CREATE INDEX "pages_title_idx" ON "pages" USING btree ("title");
  CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_page_type_idx" ON "pages" USING btree ("page_type");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_features_items_order_idx" ON "_pages_v_blocks_features_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_features_items_parent_id_idx" ON "_pages_v_blocks_features_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_features_order_idx" ON "_pages_v_blocks_features" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_features_parent_id_idx" ON "_pages_v_blocks_features" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_features_path_idx" ON "_pages_v_blocks_features" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_companies_order_idx" ON "_pages_v_blocks_companies" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_companies_parent_id_idx" ON "_pages_v_blocks_companies" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_companies_path_idx" ON "_pages_v_blocks_companies" USING btree ("_path");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_site_idx" ON "_pages_v" USING btree ("version_site_id");
  CREATE INDEX "_pages_v_version_version_title_idx" ON "_pages_v" USING btree ("version_title");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_page_type_idx" ON "_pages_v" USING btree ("version_page_type");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");

  -- S04-F4C.3: índices de integridade (não inferidos pelo Drizzle/Payload snapshot).
  -- Mantidos no final da migration Pages para que o snapshot JSON completo
  -- (20260716_124305_pages.json) continue sendo o snapshot-base canônico.
  CREATE UNIQUE INDEX "pages_site_slug_unique" ON "pages" USING btree ("site_id", "slug");
  CREATE UNIQUE INDEX "pages_one_home_per_site" ON "pages" USING btree ("site_id") WHERE "page_type" = 'home';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "pages_one_home_per_site";
  DROP INDEX IF EXISTS "pages_site_slug_unique";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_pages_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_pages_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "pages_id";
  DROP TABLE IF EXISTS "pages_blocks_hero" CASCADE;
  DROP TABLE IF EXISTS "pages_blocks_features_items" CASCADE;
  DROP TABLE IF EXISTS "pages_blocks_features" CASCADE;
  DROP TABLE IF EXISTS "pages_blocks_companies" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_blocks_hero" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_blocks_features_items" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_blocks_features" CASCADE;
  DROP TABLE IF EXISTS "_pages_v_blocks_companies" CASCADE;
  DROP TABLE IF EXISTS "_pages_v" CASCADE;
  DROP TABLE IF EXISTS "pages" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_pages_blocks_hero_variant";
  DROP TYPE IF EXISTS "public"."enum_pages_blocks_features_items_icon_key";
  DROP TYPE IF EXISTS "public"."enum_pages_blocks_features_columns";
  DROP TYPE IF EXISTS "public"."enum_pages_blocks_companies_layout";
  DROP TYPE IF EXISTS "public"."enum_pages_page_type";
  DROP TYPE IF EXISTS "public"."enum_pages_status";
  DROP TYPE IF EXISTS "public"."enum__pages_v_blocks_hero_variant";
  DROP TYPE IF EXISTS "public"."enum__pages_v_blocks_features_items_icon_key";
  DROP TYPE IF EXISTS "public"."enum__pages_v_blocks_features_columns";
  DROP TYPE IF EXISTS "public"."enum__pages_v_blocks_companies_layout";
  DROP TYPE IF EXISTS "public"."enum__pages_v_version_page_type";
  DROP TYPE IF EXISTS "public"."enum__pages_v_version_status";`)
}
