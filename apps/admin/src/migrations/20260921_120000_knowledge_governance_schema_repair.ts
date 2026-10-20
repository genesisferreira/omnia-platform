import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 17.1 — schema repair for Knowledge Governance.
 * Forward-only: lock-rels column + versioned KD/LR governance fields.
 * Idempotent (IF NOT EXISTS) — safe on staging that already received manual DDL.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "knowledge_governance_submissions_id" integer;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_kg_submissions_fk"
        FOREIGN KEY ("knowledge_governance_submissions_id")
        REFERENCES "public"."knowledge_governance_submissions"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_kg_submissions_idx"
      ON "payload_locked_documents_rels" USING btree ("knowledge_governance_submissions_id");
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_preferences_rels"
        ADD COLUMN IF NOT EXISTS "knowledge_governance_submissions_id" integer;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "_knowledge_documents_v"
      ADD COLUMN IF NOT EXISTS "version_knowledge_scope" "public"."enum_knowledge_scope" DEFAULT 'OMNIA_APPROVED',
      ADD COLUMN IF NOT EXISTS "version_school_key" varchar,
      ADD COLUMN IF NOT EXISTS "version_governance_state" varchar,
      ADD COLUMN IF NOT EXISTS "version_retrieval_eligible" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "version_assessment_secret" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "version_content_version_hash" varchar;
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_learning_resources_v"
        ADD COLUMN IF NOT EXISTS "version_knowledge_scope" "public"."enum_knowledge_scope" DEFAULT 'COURSE_PRIVATE',
        ADD COLUMN IF NOT EXISTS "version_school_key" varchar,
        ADD COLUMN IF NOT EXISTS "version_governance_state" varchar,
        ADD COLUMN IF NOT EXISTS "version_retrieval_eligible" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "version_assessment_secret" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "version_content_version_hash" varchar;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_kg_submissions_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_kg_submissions_idx";
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "knowledge_governance_submissions_id";
  `);
}
