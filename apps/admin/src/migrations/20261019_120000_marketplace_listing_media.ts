import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Marketplace B2B Fase A — arquivos de anúncio (imagens e ficha técnica) em collection própria,
 * separada de `media` (acadêmica). Idempotente.
 *
 * Única alteração em estrutura existente: as galerias `partner_*_listings_images` (criadas na
 * migration anterior do Marketplace) passam a apontar para `partner_listing_media` em vez de
 * `media`. Aborta se alguma galeria já tiver linhas, para nunca reapontar dados existentes.
 */

const GALLERIES = ['partner_product_listings_images', 'partner_service_listings_images'] as const;
const LISTINGS = ['partner_product_listings', 'partner_service_listings'] as const;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(
    sql.raw(`
    DO $$
    DECLARE n bigint;
    BEGIN
      SELECT (SELECT count(*) FROM "partner_product_listings_images")
           + (SELECT count(*) FROM "partner_service_listings_images") INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION 'marketplace_listing_media: galerias com % linha(s); migração manual necessária', n;
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS "partner_listing_media" (
      "id" serial PRIMARY KEY NOT NULL,
      "alt" varchar,
      "kind" varchar DEFAULT 'image' NOT NULL,
      "partner_id" integer NOT NULL,
      "public" boolean DEFAULT false,
      "uploaded_by_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric
    );

    DO $$ BEGIN
      ALTER TABLE "partner_listing_media" ADD CONSTRAINT "partner_listing_media_partner_id_partners_id_fk"
        FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "partner_listing_media" ADD CONSTRAINT "partner_listing_media_uploaded_by_id_users_id_fk"
        FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "partner_listing_media_filename_idx" ON "partner_listing_media" USING btree ("filename");
    CREATE INDEX IF NOT EXISTS "partner_listing_media_kind_idx" ON "partner_listing_media" USING btree ("kind");
    CREATE INDEX IF NOT EXISTS "partner_listing_media_partner_idx" ON "partner_listing_media" USING btree ("partner_id");
    CREATE INDEX IF NOT EXISTS "partner_listing_media_public_idx" ON "partner_listing_media" USING btree ("public");
    CREATE INDEX IF NOT EXISTS "partner_listing_media_uploaded_by_idx" ON "partner_listing_media" USING btree ("uploaded_by_id");
    CREATE INDEX IF NOT EXISTS "partner_listing_media_updated_at_idx" ON "partner_listing_media" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "partner_listing_media_created_at_idx" ON "partner_listing_media" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "partner_listing_media_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partner_listing_media_fk"
        FOREIGN KEY ("partner_listing_media_id") REFERENCES "public"."partner_listing_media"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_partner_listing_media_id_idx"
      ON "payload_locked_documents_rels" USING btree ("partner_listing_media_id");
  `),
  );

  for (const table of GALLERIES) {
    await db.execute(
      sql.raw(`
      ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_image_id_media_id_fk";
      DO $$ BEGIN
        ALTER TABLE "${table}" ADD CONSTRAINT "${table}_image_plm_fk"
          FOREIGN KEY ("image_id") REFERENCES "public"."partner_listing_media"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `),
    );
  }

  for (const table of LISTINGS) {
    await db.execute(
      sql.raw(`
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "datasheet_id" integer;
      DO $$ BEGIN
        ALTER TABLE "${table}" ADD CONSTRAINT "${table}_datasheet_plm_fk"
          FOREIGN KEY ("datasheet_id") REFERENCES "public"."partner_listing_media"("id") ON DELETE set null ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      CREATE INDEX IF NOT EXISTS "${table}_datasheet_idx" ON "${table}" USING btree ("datasheet_id");
    `),
    );
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const table of LISTINGS) {
    await db.execute(sql.raw(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "datasheet_id";`));
  }
  for (const table of GALLERIES) {
    await db.execute(
      sql.raw(`
      DELETE FROM "${table}";
      ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_image_plm_fk";
      DO $$ BEGIN
        ALTER TABLE "${table}" ADD CONSTRAINT "${table}_image_id_media_id_fk"
          FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `),
    );
  }
  await db.execute(
    sql.raw(`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "partner_listing_media_id";
    DROP TABLE IF EXISTS "partner_listing_media";
  `),
  );
}
