import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "ils_onboarding_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "ils_consents_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "ils_competency_history_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "ils_interventions_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "ils_generated_exercises_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "ils_assessment_blueprints_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "ils_audit_events_id" integer;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ils_audit_events_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ils_assessment_blueprints_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ils_generated_exercises_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ils_interventions_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ils_competency_history_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ils_consents_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "ils_onboarding_id";
  `);
}
