import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Adiciona o tipo de Activity `lead_captured` para auditoria de captação pública.
 * Idempotente em banco já migrado (IF NOT EXISTS).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_activities_type" ADD VALUE IF NOT EXISTS 'lead_captured';
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "activities"
    SET "type" = 'create'
    WHERE "type"::text = 'lead_captured';

    ALTER TABLE "activities" ALTER COLUMN "type" DROP DEFAULT;

    CREATE TYPE "public"."enum_activities_type_tmp" AS ENUM(
      'create',
      'update',
      'status_change',
      'comment'
    );

    ALTER TABLE "activities"
      ALTER COLUMN "type" TYPE "public"."enum_activities_type_tmp"
      USING ("type"::text::"public"."enum_activities_type_tmp");

    DROP TYPE "public"."enum_activities_type";
    ALTER TYPE "public"."enum_activities_type_tmp" RENAME TO "enum_activities_type";

    ALTER TABLE "activities"
      ALTER COLUMN "type" SET DEFAULT 'comment'::"public"."enum_activities_type";
  `);
}
