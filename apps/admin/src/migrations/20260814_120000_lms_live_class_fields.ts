import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "lms_academic_events" ADD COLUMN IF NOT EXISTS "meeting_url" varchar;
    ALTER TABLE "lms_academic_events" ADD COLUMN IF NOT EXISTS "platform" varchar;
    ALTER TABLE "lms_academic_events" ADD COLUMN IF NOT EXISTS "instructions" varchar;
    ALTER TABLE "lms_academic_events" ADD COLUMN IF NOT EXISTS "recording_url" varchar;
    ALTER TABLE "lms_academic_events" ADD COLUMN IF NOT EXISTS "join_window_minutes" numeric DEFAULT 15;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "lms_academic_events" DROP COLUMN IF EXISTS "meeting_url";
    ALTER TABLE "lms_academic_events" DROP COLUMN IF EXISTS "platform";
    ALTER TABLE "lms_academic_events" DROP COLUMN IF EXISTS "instructions";
    ALTER TABLE "lms_academic_events" DROP COLUMN IF EXISTS "recording_url";
    ALTER TABLE "lms_academic_events" DROP COLUMN IF EXISTS "join_window_minutes";
  `);
}
