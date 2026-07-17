import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_companies_offerings_kind" AS ENUM('service', 'product', 'course', 'solution');
  CREATE TYPE "public"."enum_companies_brand_theme" AS ENUM('omnia', 'renovacao', 'fred', 'cte', 'neurofrigo');
  CREATE TYPE "public"."enum_companies_seo_schema_type" AS ENUM('WebPage', 'Article', 'BlogPosting', 'Organization', 'LocalBusiness', 'Course', 'Event', 'FAQPage', 'Product');
  CREATE TYPE "public"."enum_companies_publishat_tz" AS ENUM('Pacific/Midway', 'Pacific/Niue', 'Pacific/Honolulu', 'Pacific/Rarotonga', 'America/Anchorage', 'Pacific/Gambier', 'America/Los_Angeles', 'America/Tijuana', 'America/Denver', 'America/Phoenix', 'America/Chicago', 'America/Guatemala', 'America/New_York', 'America/Bogota', 'America/Caracas', 'America/Santiago', 'America/Buenos_Aires', 'America/Sao_Paulo', 'Atlantic/South_Georgia', 'Atlantic/Azores', 'Atlantic/Cape_Verde', 'Europe/London', 'Europe/Berlin', 'Africa/Lagos', 'Europe/Athens', 'Africa/Cairo', 'Europe/Moscow', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Baku', 'Asia/Karachi', 'Asia/Tashkent', 'Asia/Calcutta', 'Asia/Dhaka', 'Asia/Almaty', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Brisbane', 'Australia/Sydney', 'Pacific/Guam', 'Pacific/Noumea', 'Pacific/Auckland', 'Pacific/Fiji');
  CREATE TYPE "public"."enum_companies_unpublishat_tz" AS ENUM('Pacific/Midway', 'Pacific/Niue', 'Pacific/Honolulu', 'Pacific/Rarotonga', 'America/Anchorage', 'Pacific/Gambier', 'America/Los_Angeles', 'America/Tijuana', 'America/Denver', 'America/Phoenix', 'America/Chicago', 'America/Guatemala', 'America/New_York', 'America/Bogota', 'America/Caracas', 'America/Santiago', 'America/Buenos_Aires', 'America/Sao_Paulo', 'Atlantic/South_Georgia', 'Atlantic/Azores', 'Atlantic/Cape_Verde', 'Europe/London', 'Europe/Berlin', 'Africa/Lagos', 'Europe/Athens', 'Africa/Cairo', 'Europe/Moscow', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Baku', 'Asia/Karachi', 'Asia/Tashkent', 'Asia/Calcutta', 'Asia/Dhaka', 'Asia/Almaty', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Brisbane', 'Australia/Sydney', 'Pacific/Guam', 'Pacific/Noumea', 'Pacific/Auckland', 'Pacific/Fiji');
  CREATE TYPE "public"."enum_companies_expiresat_tz" AS ENUM('Pacific/Midway', 'Pacific/Niue', 'Pacific/Honolulu', 'Pacific/Rarotonga', 'America/Anchorage', 'Pacific/Gambier', 'America/Los_Angeles', 'America/Tijuana', 'America/Denver', 'America/Phoenix', 'America/Chicago', 'America/Guatemala', 'America/New_York', 'America/Bogota', 'America/Caracas', 'America/Santiago', 'America/Buenos_Aires', 'America/Sao_Paulo', 'Atlantic/South_Georgia', 'Atlantic/Azores', 'Atlantic/Cape_Verde', 'Europe/London', 'Europe/Berlin', 'Africa/Lagos', 'Europe/Athens', 'Africa/Cairo', 'Europe/Moscow', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Baku', 'Asia/Karachi', 'Asia/Tashkent', 'Asia/Calcutta', 'Asia/Dhaka', 'Asia/Almaty', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Brisbane', 'Australia/Sydney', 'Pacific/Guam', 'Pacific/Noumea', 'Pacific/Auckland', 'Pacific/Fiji');
  CREATE TYPE "public"."enum_companies_timezone" AS ENUM('America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'America/Fortaleza', 'America/Recife', 'America/Cuiaba', 'America/Porto_Velho', 'America/Rio_Branco', 'UTC');
  CREATE TYPE "public"."enum_companies_publishedat_tz" AS ENUM('Pacific/Midway', 'Pacific/Niue', 'Pacific/Honolulu', 'Pacific/Rarotonga', 'America/Anchorage', 'Pacific/Gambier', 'America/Los_Angeles', 'America/Tijuana', 'America/Denver', 'America/Phoenix', 'America/Chicago', 'America/Guatemala', 'America/New_York', 'America/Bogota', 'America/Caracas', 'America/Santiago', 'America/Buenos_Aires', 'America/Sao_Paulo', 'Atlantic/South_Georgia', 'Atlantic/Azores', 'Atlantic/Cape_Verde', 'Europe/London', 'Europe/Berlin', 'Africa/Lagos', 'Europe/Athens', 'Africa/Cairo', 'Europe/Moscow', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Baku', 'Asia/Karachi', 'Asia/Tashkent', 'Asia/Calcutta', 'Asia/Dhaka', 'Asia/Almaty', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Brisbane', 'Australia/Sydney', 'Pacific/Guam', 'Pacific/Noumea', 'Pacific/Auckland', 'Pacific/Fiji');
  CREATE TYPE "public"."enum_companies_archivedat_tz" AS ENUM('Pacific/Midway', 'Pacific/Niue', 'Pacific/Honolulu', 'Pacific/Rarotonga', 'America/Anchorage', 'Pacific/Gambier', 'America/Los_Angeles', 'America/Tijuana', 'America/Denver', 'America/Phoenix', 'America/Chicago', 'America/Guatemala', 'America/New_York', 'America/Bogota', 'America/Caracas', 'America/Santiago', 'America/Buenos_Aires', 'America/Sao_Paulo', 'Atlantic/South_Georgia', 'Atlantic/Azores', 'Atlantic/Cape_Verde', 'Europe/London', 'Europe/Berlin', 'Africa/Lagos', 'Europe/Athens', 'Africa/Cairo', 'Europe/Moscow', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Baku', 'Asia/Karachi', 'Asia/Tashkent', 'Asia/Calcutta', 'Asia/Dhaka', 'Asia/Almaty', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Brisbane', 'Australia/Sydney', 'Pacific/Guam', 'Pacific/Noumea', 'Pacific/Auckland', 'Pacific/Fiji');
  CREATE TABLE "companies_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "companies_differentiators" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "companies_authority_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "companies_offerings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"kind" "enum_companies_offerings_kind" DEFAULT 'service'
  );
  
  CREATE TABLE "companies_audiences" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar
  );
  
  CREATE TABLE "companies_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "companies_seo_keywords" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"keyword" varchar NOT NULL
  );
  
  ALTER TABLE "media" ALTER COLUMN "alt" SET DEFAULT '';
  UPDATE "media" SET "alt" = '' WHERE "alt" IS NULL;
  ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;
  ALTER TABLE "companies" ADD COLUMN "portal_slug" varchar;
  UPDATE "companies" SET "portal_slug" = "slug" WHERE "portal_slug" IS NULL;
  ALTER TABLE "companies" ALTER COLUMN "portal_slug" SET NOT NULL;
  ALTER TABLE "companies" ADD COLUMN "positioning" varchar;
  ALTER TABLE "companies" ADD COLUMN "is_holding" boolean DEFAULT false;
  ALTER TABLE "companies" ADD COLUMN "show_in_ecosystem" boolean DEFAULT true;
  ALTER TABLE "companies" ADD COLUMN "brand_theme" "enum_companies_brand_theme" DEFAULT 'omnia';
  ALTER TABLE "companies" ADD COLUMN "institutional_text" varchar;
  ALTER TABLE "companies" ADD COLUMN "mission" varchar;
  ALTER TABLE "companies" ADD COLUMN "vision" varchar;
  ALTER TABLE "companies" ADD COLUMN "cover_image_id" integer;
  ALTER TABLE "companies" ADD COLUMN "primary_cta_label" varchar;
  ALTER TABLE "companies" ADD COLUMN "primary_cta_href" varchar;
  ALTER TABLE "companies" ADD COLUMN "secondary_cta_label" varchar;
  ALTER TABLE "companies" ADD COLUMN "secondary_cta_href" varchar;
  ALTER TABLE "companies" ADD COLUMN "seo_meta_title" varchar;
  ALTER TABLE "companies" ADD COLUMN "seo_meta_description" varchar;
  ALTER TABLE "companies" ADD COLUMN "seo_canonical_url" varchar;
  ALTER TABLE "companies" ADD COLUMN "seo_open_graph_image_id" integer;
  ALTER TABLE "companies" ADD COLUMN "seo_open_graph_title" varchar;
  ALTER TABLE "companies" ADD COLUMN "seo_open_graph_description" varchar;
  ALTER TABLE "companies" ADD COLUMN "seo_no_index" boolean DEFAULT false;
  ALTER TABLE "companies" ADD COLUMN "seo_no_follow" boolean DEFAULT false;
  ALTER TABLE "companies" ADD COLUMN "seo_schema_type" "enum_companies_seo_schema_type";
  ALTER TABLE "companies" ADD COLUMN "seo_json_ld" jsonb;
  ALTER TABLE "companies" ADD COLUMN "publish_at" timestamp(3) with time zone;
  ALTER TABLE "companies" ADD COLUMN "publishat_tz" "enum_companies_publishat_tz";
  ALTER TABLE "companies" ADD COLUMN "unpublish_at" timestamp(3) with time zone;
  ALTER TABLE "companies" ADD COLUMN "unpublishat_tz" "enum_companies_unpublishat_tz";
  ALTER TABLE "companies" ADD COLUMN "expires_at" timestamp(3) with time zone;
  ALTER TABLE "companies" ADD COLUMN "expiresat_tz" "enum_companies_expiresat_tz";
  ALTER TABLE "companies" ADD COLUMN "timezone" "enum_companies_timezone" DEFAULT 'America/Sao_Paulo' NOT NULL;
  ALTER TABLE "companies" ADD COLUMN "published_at" timestamp(3) with time zone;
  ALTER TABLE "companies" ADD COLUMN "publishedat_tz" "enum_companies_publishedat_tz";
  ALTER TABLE "companies" ADD COLUMN "archived_at" timestamp(3) with time zone;
  ALTER TABLE "companies" ADD COLUMN "archivedat_tz" "enum_companies_archivedat_tz";
  ALTER TABLE "companies" ADD COLUMN "publication_notes" varchar;
  ALTER TABLE "companies_values" ADD CONSTRAINT "companies_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "companies_differentiators" ADD CONSTRAINT "companies_differentiators_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "companies_authority_stats" ADD CONSTRAINT "companies_authority_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "companies_offerings" ADD CONSTRAINT "companies_offerings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "companies_audiences" ADD CONSTRAINT "companies_audiences_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "companies_gallery" ADD CONSTRAINT "companies_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "companies_gallery" ADD CONSTRAINT "companies_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "companies_seo_keywords" ADD CONSTRAINT "companies_seo_keywords_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "companies_values_order_idx" ON "companies_values" USING btree ("_order");
  CREATE INDEX "companies_values_parent_id_idx" ON "companies_values" USING btree ("_parent_id");
  CREATE INDEX "companies_differentiators_order_idx" ON "companies_differentiators" USING btree ("_order");
  CREATE INDEX "companies_differentiators_parent_id_idx" ON "companies_differentiators" USING btree ("_parent_id");
  CREATE INDEX "companies_authority_stats_order_idx" ON "companies_authority_stats" USING btree ("_order");
  CREATE INDEX "companies_authority_stats_parent_id_idx" ON "companies_authority_stats" USING btree ("_parent_id");
  CREATE INDEX "companies_offerings_order_idx" ON "companies_offerings" USING btree ("_order");
  CREATE INDEX "companies_offerings_parent_id_idx" ON "companies_offerings" USING btree ("_parent_id");
  CREATE INDEX "companies_audiences_order_idx" ON "companies_audiences" USING btree ("_order");
  CREATE INDEX "companies_audiences_parent_id_idx" ON "companies_audiences" USING btree ("_parent_id");
  CREATE INDEX "companies_gallery_order_idx" ON "companies_gallery" USING btree ("_order");
  CREATE INDEX "companies_gallery_parent_id_idx" ON "companies_gallery" USING btree ("_parent_id");
  CREATE INDEX "companies_gallery_image_idx" ON "companies_gallery" USING btree ("image_id");
  CREATE INDEX "companies_seo_keywords_order_idx" ON "companies_seo_keywords" USING btree ("_order");
  CREATE INDEX "companies_seo_keywords_parent_id_idx" ON "companies_seo_keywords" USING btree ("_parent_id");
  ALTER TABLE "companies" ADD CONSTRAINT "companies_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "companies" ADD CONSTRAINT "companies_seo_open_graph_image_id_media_id_fk" FOREIGN KEY ("seo_open_graph_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "companies_portal_slug_idx" ON "companies" USING btree ("portal_slug");
  CREATE INDEX "companies_cover_image_idx" ON "companies" USING btree ("cover_image_id");
  CREATE INDEX "companies_seo_seo_open_graph_image_idx" ON "companies" USING btree ("seo_open_graph_image_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "companies_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "companies_differentiators" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "companies_authority_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "companies_offerings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "companies_audiences" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "companies_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "companies_seo_keywords" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "companies_values" CASCADE;
  DROP TABLE "companies_differentiators" CASCADE;
  DROP TABLE "companies_authority_stats" CASCADE;
  DROP TABLE "companies_offerings" CASCADE;
  DROP TABLE "companies_audiences" CASCADE;
  DROP TABLE "companies_gallery" CASCADE;
  DROP TABLE "companies_seo_keywords" CASCADE;
  ALTER TABLE "companies" DROP CONSTRAINT "companies_cover_image_id_media_id_fk";
  
  ALTER TABLE "companies" DROP CONSTRAINT "companies_seo_open_graph_image_id_media_id_fk";
  
  DROP INDEX "companies_portal_slug_idx";
  DROP INDEX "companies_cover_image_idx";
  DROP INDEX "companies_seo_seo_open_graph_image_idx";
  ALTER TABLE "media" ALTER COLUMN "alt" DROP NOT NULL;
  ALTER TABLE "companies" DROP COLUMN "portal_slug";
  ALTER TABLE "companies" DROP COLUMN "positioning";
  ALTER TABLE "companies" DROP COLUMN "is_holding";
  ALTER TABLE "companies" DROP COLUMN "show_in_ecosystem";
  ALTER TABLE "companies" DROP COLUMN "brand_theme";
  ALTER TABLE "companies" DROP COLUMN "institutional_text";
  ALTER TABLE "companies" DROP COLUMN "mission";
  ALTER TABLE "companies" DROP COLUMN "vision";
  ALTER TABLE "companies" DROP COLUMN "cover_image_id";
  ALTER TABLE "companies" DROP COLUMN "primary_cta_label";
  ALTER TABLE "companies" DROP COLUMN "primary_cta_href";
  ALTER TABLE "companies" DROP COLUMN "secondary_cta_label";
  ALTER TABLE "companies" DROP COLUMN "secondary_cta_href";
  ALTER TABLE "companies" DROP COLUMN "seo_meta_title";
  ALTER TABLE "companies" DROP COLUMN "seo_meta_description";
  ALTER TABLE "companies" DROP COLUMN "seo_canonical_url";
  ALTER TABLE "companies" DROP COLUMN "seo_open_graph_image_id";
  ALTER TABLE "companies" DROP COLUMN "seo_open_graph_title";
  ALTER TABLE "companies" DROP COLUMN "seo_open_graph_description";
  ALTER TABLE "companies" DROP COLUMN "seo_no_index";
  ALTER TABLE "companies" DROP COLUMN "seo_no_follow";
  ALTER TABLE "companies" DROP COLUMN "seo_schema_type";
  ALTER TABLE "companies" DROP COLUMN "seo_json_ld";
  ALTER TABLE "companies" DROP COLUMN "publish_at";
  ALTER TABLE "companies" DROP COLUMN "publishat_tz";
  ALTER TABLE "companies" DROP COLUMN "unpublish_at";
  ALTER TABLE "companies" DROP COLUMN "unpublishat_tz";
  ALTER TABLE "companies" DROP COLUMN "expires_at";
  ALTER TABLE "companies" DROP COLUMN "expiresat_tz";
  ALTER TABLE "companies" DROP COLUMN "timezone";
  ALTER TABLE "companies" DROP COLUMN "published_at";
  ALTER TABLE "companies" DROP COLUMN "publishedat_tz";
  ALTER TABLE "companies" DROP COLUMN "archived_at";
  ALTER TABLE "companies" DROP COLUMN "archivedat_tz";
  ALTER TABLE "companies" DROP COLUMN "publication_notes";
  DROP TYPE "public"."enum_companies_offerings_kind";
  DROP TYPE "public"."enum_companies_brand_theme";
  DROP TYPE "public"."enum_companies_seo_schema_type";
  DROP TYPE "public"."enum_companies_publishat_tz";
  DROP TYPE "public"."enum_companies_unpublishat_tz";
  DROP TYPE "public"."enum_companies_expiresat_tz";
  DROP TYPE "public"."enum_companies_timezone";
  DROP TYPE "public"."enum_companies_publishedat_tz";
  DROP TYPE "public"."enum_companies_archivedat_tz";`)
}
