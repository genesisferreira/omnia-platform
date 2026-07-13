import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_sites_type" AS ENUM('holding_portal', 'company_profile', 'institutional', 'education', 'campaign', 'application', 'marketplace');
  CREATE TYPE "public"."enum_sites_visibility_scope" AS ENUM('holding', 'tenant', 'company', 'shared', 'public');
  CREATE TYPE "public"."enum_sites_editorial_status" AS ENUM('draft', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published', 'updated', 'archived', 'discontinued', 'deleted');
  CREATE TYPE "public"."enum_sites_site_status" AS ENUM('draft', 'active', 'inactive', 'maintenance', 'archived');
  CREATE TYPE "public"."enum_sites_environment" AS ENUM('local', 'development', 'staging', 'production');
  CREATE TYPE "public"."enum_sites_locale" AS ENUM('pt-BR', 'en', 'es');
  CREATE TYPE "public"."enum_sites_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__sites_v_version_type" AS ENUM('holding_portal', 'company_profile', 'institutional', 'education', 'campaign', 'application', 'marketplace');
  CREATE TYPE "public"."enum__sites_v_version_visibility_scope" AS ENUM('holding', 'tenant', 'company', 'shared', 'public');
  CREATE TYPE "public"."enum__sites_v_version_editorial_status" AS ENUM('draft', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published', 'updated', 'archived', 'discontinued', 'deleted');
  CREATE TYPE "public"."enum__sites_v_version_site_status" AS ENUM('draft', 'active', 'inactive', 'maintenance', 'archived');
  CREATE TYPE "public"."enum__sites_v_version_environment" AS ENUM('local', 'development', 'staging', 'production');
  CREATE TYPE "public"."enum__sites_v_version_locale" AS ENUM('pt-BR', 'en', 'es');
  CREATE TYPE "public"."enum__sites_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "sites" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"internal_name" varchar,
  	"slug" varchar,
  	"type" "enum_sites_type" DEFAULT 'institutional',
  	"external_url" varchar,
  	"notes" varchar,
  	"tenant_id" integer,
  	"company_id" integer,
  	"visibility_scope" "enum_sites_visibility_scope" DEFAULT 'holding',
  	"is_shared_across_companies" boolean DEFAULT false,
  	"editorial_status" "enum_sites_editorial_status" DEFAULT 'draft',
  	"editorial_notes" varchar,
  	"reviewed_by_id" integer,
  	"reviewed_at" timestamp(3) with time zone,
  	"approved_by_id" integer,
  	"approved_at" timestamp(3) with time zone,
  	"preview_confirmed_by_id" integer,
  	"preview_confirmed_at" timestamp(3) with time zone,
  	"site_status" "enum_sites_site_status" DEFAULT 'draft',
  	"environment" "enum_sites_environment" DEFAULT 'development',
  	"locale" "enum_sites_locale" DEFAULT 'pt-BR',
  	"timezone" varchar DEFAULT 'America/Sao_Paulo',
  	"is_external" boolean DEFAULT false,
  	"is_primary_for_company" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_sites_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_sites_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_internal_name" varchar,
  	"version_slug" varchar,
  	"version_type" "enum__sites_v_version_type" DEFAULT 'institutional',
  	"version_external_url" varchar,
  	"version_notes" varchar,
  	"version_tenant_id" integer,
  	"version_company_id" integer,
  	"version_visibility_scope" "enum__sites_v_version_visibility_scope" DEFAULT 'holding',
  	"version_is_shared_across_companies" boolean DEFAULT false,
  	"version_editorial_status" "enum__sites_v_version_editorial_status" DEFAULT 'draft',
  	"version_editorial_notes" varchar,
  	"version_reviewed_by_id" integer,
  	"version_reviewed_at" timestamp(3) with time zone,
  	"version_approved_by_id" integer,
  	"version_approved_at" timestamp(3) with time zone,
  	"version_preview_confirmed_by_id" integer,
  	"version_preview_confirmed_at" timestamp(3) with time zone,
  	"version_site_status" "enum__sites_v_version_site_status" DEFAULT 'draft',
  	"version_environment" "enum__sites_v_version_environment" DEFAULT 'development',
  	"version_locale" "enum__sites_v_version_locale" DEFAULT 'pt-BR',
  	"version_timezone" varchar DEFAULT 'America/Sao_Paulo',
  	"version_is_external" boolean DEFAULT false,
  	"version_is_primary_for_company" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__sites_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sites_id" integer;
  ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sites" ADD CONSTRAINT "sites_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sites" ADD CONSTRAINT "sites_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sites" ADD CONSTRAINT "sites_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sites" ADD CONSTRAINT "sites_preview_confirmed_by_id_users_id_fk" FOREIGN KEY ("preview_confirmed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sites_v" ADD CONSTRAINT "_sites_v_parent_id_sites_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sites_v" ADD CONSTRAINT "_sites_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sites_v" ADD CONSTRAINT "_sites_v_version_company_id_companies_id_fk" FOREIGN KEY ("version_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sites_v" ADD CONSTRAINT "_sites_v_version_reviewed_by_id_users_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sites_v" ADD CONSTRAINT "_sites_v_version_approved_by_id_users_id_fk" FOREIGN KEY ("version_approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_sites_v" ADD CONSTRAINT "_sites_v_version_preview_confirmed_by_id_users_id_fk" FOREIGN KEY ("version_preview_confirmed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "sites_name_idx" ON "sites" USING btree ("name");
  CREATE INDEX "sites_internal_name_idx" ON "sites" USING btree ("internal_name");
  CREATE UNIQUE INDEX "sites_slug_idx" ON "sites" USING btree ("slug");
  CREATE INDEX "sites_tenant_idx" ON "sites" USING btree ("tenant_id");
  CREATE INDEX "sites_company_idx" ON "sites" USING btree ("company_id");
  CREATE INDEX "sites_reviewed_by_idx" ON "sites" USING btree ("reviewed_by_id");
  CREATE INDEX "sites_approved_by_idx" ON "sites" USING btree ("approved_by_id");
  CREATE INDEX "sites_preview_confirmed_by_idx" ON "sites" USING btree ("preview_confirmed_by_id");
  CREATE INDEX "sites_site_status_idx" ON "sites" USING btree ("site_status");
  CREATE INDEX "sites_environment_idx" ON "sites" USING btree ("environment");
  CREATE INDEX "sites_is_external_idx" ON "sites" USING btree ("is_external");
  CREATE INDEX "sites_is_primary_for_company_idx" ON "sites" USING btree ("is_primary_for_company");
  CREATE INDEX "sites_updated_at_idx" ON "sites" USING btree ("updated_at");
  CREATE INDEX "sites_created_at_idx" ON "sites" USING btree ("created_at");
  CREATE INDEX "sites__status_idx" ON "sites" USING btree ("_status");
  CREATE INDEX "_sites_v_parent_idx" ON "_sites_v" USING btree ("parent_id");
  CREATE INDEX "_sites_v_version_version_name_idx" ON "_sites_v" USING btree ("version_name");
  CREATE INDEX "_sites_v_version_version_internal_name_idx" ON "_sites_v" USING btree ("version_internal_name");
  CREATE INDEX "_sites_v_version_version_slug_idx" ON "_sites_v" USING btree ("version_slug");
  CREATE INDEX "_sites_v_version_version_tenant_idx" ON "_sites_v" USING btree ("version_tenant_id");
  CREATE INDEX "_sites_v_version_version_company_idx" ON "_sites_v" USING btree ("version_company_id");
  CREATE INDEX "_sites_v_version_version_reviewed_by_idx" ON "_sites_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "_sites_v_version_version_approved_by_idx" ON "_sites_v" USING btree ("version_approved_by_id");
  CREATE INDEX "_sites_v_version_version_preview_confirmed_by_idx" ON "_sites_v" USING btree ("version_preview_confirmed_by_id");
  CREATE INDEX "_sites_v_version_version_site_status_idx" ON "_sites_v" USING btree ("version_site_status");
  CREATE INDEX "_sites_v_version_version_environment_idx" ON "_sites_v" USING btree ("version_environment");
  CREATE INDEX "_sites_v_version_version_is_external_idx" ON "_sites_v" USING btree ("version_is_external");
  CREATE INDEX "_sites_v_version_version_is_primary_for_company_idx" ON "_sites_v" USING btree ("version_is_primary_for_company");
  CREATE INDEX "_sites_v_version_version_updated_at_idx" ON "_sites_v" USING btree ("version_updated_at");
  CREATE INDEX "_sites_v_version_version_created_at_idx" ON "_sites_v" USING btree ("version_created_at");
  CREATE INDEX "_sites_v_version_version__status_idx" ON "_sites_v" USING btree ("version__status");
  CREATE INDEX "_sites_v_created_at_idx" ON "_sites_v" USING btree ("created_at");
  CREATE INDEX "_sites_v_updated_at_idx" ON "_sites_v" USING btree ("updated_at");
  CREATE INDEX "_sites_v_latest_idx" ON "_sites_v" USING btree ("latest");
  CREATE INDEX "_sites_v_autosave_idx" ON "_sites_v" USING btree ("autosave");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sites_fk" FOREIGN KEY ("sites_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_sites_id_idx" ON "payload_locked_documents_rels" USING btree ("sites_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_sites_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "sites" CASCADE;
  DROP TABLE "_sites_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_sites_fk";
  
  DROP INDEX "payload_locked_documents_rels_sites_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "sites_id";
  DROP TYPE "public"."enum_sites_type";
  DROP TYPE "public"."enum_sites_visibility_scope";
  DROP TYPE "public"."enum_sites_editorial_status";
  DROP TYPE "public"."enum_sites_site_status";
  DROP TYPE "public"."enum_sites_environment";
  DROP TYPE "public"."enum_sites_locale";
  DROP TYPE "public"."enum_sites_status";
  DROP TYPE "public"."enum__sites_v_version_type";
  DROP TYPE "public"."enum__sites_v_version_visibility_scope";
  DROP TYPE "public"."enum__sites_v_version_editorial_status";
  DROP TYPE "public"."enum__sites_v_version_site_status";
  DROP TYPE "public"."enum__sites_v_version_environment";
  DROP TYPE "public"."enum__sites_v_version_locale";
  DROP TYPE "public"."enum__sites_v_version_status";`)
}
