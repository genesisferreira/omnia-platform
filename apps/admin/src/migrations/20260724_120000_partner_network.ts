import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Sprint 2.3 — Partner Network (estrutura admin):
 * - partner-categories
 * - partners (+ gallery + categories rels)
 * - global partner-network-dashboard
 * - colunas locked/preferences para as novas collections
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_partners_partner_type" AS ENUM('company', 'professional');
    CREATE TYPE "public"."enum_partners_status" AS ENUM(
      'draft',
      'pending',
      'approved',
      'rejected',
      'suspended'
    );

    CREATE TABLE IF NOT EXISTS "partner_categories" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "description" varchar,
      "active" boolean DEFAULT true,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "partner_categories_slug_idx"
      ON "partner_categories" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "partner_categories_updated_at_idx"
      ON "partner_categories" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "partner_categories_created_at_idx"
      ON "partner_categories" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "partners" (
      "id" serial PRIMARY KEY NOT NULL,
      "company_name" varchar NOT NULL,
      "trade_name" varchar,
      "partner_type" "public"."enum_partners_partner_type" DEFAULT 'company' NOT NULL,
      "document" varchar,
      "description" varchar,
      "email" varchar,
      "phone" varchar,
      "whatsapp" varchar,
      "website" varchar,
      "social_instagram" varchar,
      "social_linkedin" varchar,
      "social_facebook" varchar,
      "social_youtube" varchar,
      "logo_id" integer,
      "address" varchar,
      "zip_code" varchar,
      "city" varchar,
      "state" varchar,
      "country" varchar DEFAULT 'Brasil',
      "latitude" numeric,
      "longitude" numeric,
      "service_radius" numeric,
      "status" "public"."enum_partners_status" DEFAULT 'pending' NOT NULL,
      "featured" boolean DEFAULT false,
      "active" boolean DEFAULT true,
      "approved_at" timestamp(3) with time zone,
      "approved_by_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "partners_gallery" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "image_id" integer NOT NULL,
      "caption" varchar
    );

    CREATE TABLE IF NOT EXISTS "partners_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "partner_categories_id" integer
    );

    DO $$ BEGIN
      ALTER TABLE "partners"
        ADD CONSTRAINT "partners_logo_id_media_id_fk"
        FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "partners"
        ADD CONSTRAINT "partners_approved_by_id_users_id_fk"
        FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "partners_gallery"
        ADD CONSTRAINT "partners_gallery_image_id_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "partners_gallery"
        ADD CONSTRAINT "partners_gallery_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."partners"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "partners_rels"
        ADD CONSTRAINT "partners_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."partners"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "partners_rels"
        ADD CONSTRAINT "partners_rels_partner_categories_fk"
        FOREIGN KEY ("partner_categories_id") REFERENCES "public"."partner_categories"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "partners_logo_idx" ON "partners" USING btree ("logo_id");
    CREATE INDEX IF NOT EXISTS "partners_approved_by_idx" ON "partners" USING btree ("approved_by_id");
    CREATE INDEX IF NOT EXISTS "partners_updated_at_idx" ON "partners" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "partners_created_at_idx" ON "partners" USING btree ("created_at");

    CREATE INDEX IF NOT EXISTS "partners_gallery_order_idx" ON "partners_gallery" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "partners_gallery_parent_id_idx" ON "partners_gallery" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "partners_gallery_image_idx" ON "partners_gallery" USING btree ("image_id");

    CREATE INDEX IF NOT EXISTS "partners_rels_order_idx" ON "partners_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "partners_rels_parent_idx" ON "partners_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "partners_rels_path_idx" ON "partners_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "partners_rels_partner_categories_id_idx"
      ON "partners_rels" USING btree ("partner_categories_id");

    CREATE TABLE IF NOT EXISTS "partner_network_dashboard" (
      "id" serial PRIMARY KEY NOT NULL,
      "placeholder_note" varchar,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "partner_categories_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "partners_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_partner_categories_fk"
        FOREIGN KEY ("partner_categories_id") REFERENCES "public"."partner_categories"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_partners_fk"
        FOREIGN KEY ("partners_id") REFERENCES "public"."partners"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_partner_categories_id_idx"
      ON "payload_locked_documents_rels" USING btree ("partner_categories_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_partners_id_idx"
      ON "payload_locked_documents_rels" USING btree ("partners_id");

    ALTER TABLE "payload_preferences_rels"
      ADD COLUMN IF NOT EXISTS "partner_categories_id" integer;
    ALTER TABLE "payload_preferences_rels"
      ADD COLUMN IF NOT EXISTS "partners_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_preferences_rels"
        ADD CONSTRAINT "payload_preferences_rels_partner_categories_fk"
        FOREIGN KEY ("partner_categories_id") REFERENCES "public"."partner_categories"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_preferences_rels"
        ADD CONSTRAINT "payload_preferences_rels_partners_fk"
        FOREIGN KEY ("partners_id") REFERENCES "public"."partners"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_partner_categories_id_idx"
      ON "payload_preferences_rels" USING btree ("partner_categories_id");
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_partners_id_idx"
      ON "payload_preferences_rels" USING btree ("partners_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_preferences_rels"
      DROP CONSTRAINT IF EXISTS "payload_preferences_rels_partners_fk";
    ALTER TABLE "payload_preferences_rels"
      DROP CONSTRAINT IF EXISTS "payload_preferences_rels_partner_categories_fk";
    DROP INDEX IF EXISTS "payload_preferences_rels_partners_id_idx";
    DROP INDEX IF EXISTS "payload_preferences_rels_partner_categories_id_idx";
    ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "partners_id";
    ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "partner_categories_id";

    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_partners_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_partner_categories_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_partners_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_partner_categories_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "partners_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "partner_categories_id";

    DROP TABLE IF EXISTS "partner_network_dashboard" CASCADE;
    DROP TABLE IF EXISTS "partners_rels" CASCADE;
    DROP TABLE IF EXISTS "partners_gallery" CASCADE;
    DROP TABLE IF EXISTS "partners" CASCADE;
    DROP TABLE IF EXISTS "partner_categories" CASCADE;

    DROP TYPE IF EXISTS "public"."enum_partners_status";
    DROP TYPE IF EXISTS "public"."enum_partners_partner_type";
  `);
}
