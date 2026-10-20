import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * S0.1 — estabilização Admin LMS Políticas (404).
 *
 * Campos `provisionEnabled` / `provisionDryRun` foram adicionados ao Global
 * `lms-settings` sem migration correspondente. findGlobal falhava com
 * `column "provision_enabled" does not exist` e o Admin renderizava 404.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "lms_settings"
      ADD COLUMN IF NOT EXISTS "provision_enabled" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "provision_dry_run" boolean DEFAULT true;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "lms_settings"
      DROP COLUMN IF EXISTS "provision_dry_run",
      DROP COLUMN IF EXISTS "provision_enabled";
  `);
}
