import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Sprint 2.3 — metadados de geocodificação no Partner.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_partners_geocoding_status" AS ENUM(
        'pending',
        'success',
        'failed',
        'manual'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "partners"
      ADD COLUMN IF NOT EXISTS "geocoding_status" "public"."enum_partners_geocoding_status" DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "geocoding_provider" varchar,
      ADD COLUMN IF NOT EXISTS "geocoded_at" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "partners"
      DROP COLUMN IF EXISTS "geocoded_at",
      DROP COLUMN IF EXISTS "geocoding_provider",
      DROP COLUMN IF EXISTS "geocoding_status";

    DROP TYPE IF EXISTS "public"."enum_partners_geocoding_status";
  `);
}
