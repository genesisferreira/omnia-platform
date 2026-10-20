import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_domains_environment" AS ENUM('local', 'development', 'staging', 'production');
  CREATE TABLE "domains" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hostname" varchar NOT NULL,
  	"normalized_hostname" varchar NOT NULL,
  	"site_id" integer NOT NULL,
  	"notes" varchar,
  	"environment" "enum_domains_environment" DEFAULT 'production' NOT NULL,
  	"is_primary" boolean DEFAULT true,
  	"is_active" boolean DEFAULT true,
  	"redirect_to_primary" boolean DEFAULT false,
  	"force_https" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "domains_id" integer;
  ALTER TABLE "domains" ADD CONSTRAINT "domains_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "domains_normalized_hostname_idx" ON "domains" USING btree ("normalized_hostname");
  CREATE INDEX "domains_site_idx" ON "domains" USING btree ("site_id");
  CREATE INDEX "domains_updated_at_idx" ON "domains" USING btree ("updated_at");
  CREATE INDEX "domains_created_at_idx" ON "domains" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_domains_fk" FOREIGN KEY ("domains_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_domains_id_idx" ON "payload_locked_documents_rels" USING btree ("domains_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "domains" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "domains" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_domains_fk";
  
  DROP INDEX "payload_locked_documents_rels_domains_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "domains_id";
  DROP TYPE "public"."enum_domains_environment";`)
}
