import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 17 — Knowledge Governance scopes + submissions.
 * Conservative: LMS/learning-resources default COURSE_PRIVATE / not retrieval-eligible.
 * Existing Hub documents keep OMNIA_APPROVED + retrievalEligible=true (do not downgrade EPIC 10).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_knowledge_scope" AS ENUM('COURSE_PRIVATE', 'SCHOOL_APPROVED', 'OMNIA_APPROVED');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "learning_resources"
      ADD COLUMN IF NOT EXISTS "knowledge_scope" "public"."enum_knowledge_scope" DEFAULT 'COURSE_PRIVATE',
      ADD COLUMN IF NOT EXISTS "school_key" varchar,
      ADD COLUMN IF NOT EXISTS "governance_state" varchar DEFAULT 'COURSE_PRIVATE',
      ADD COLUMN IF NOT EXISTS "retrieval_eligible" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "assessment_secret" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "content_version_hash" varchar;
  `);

  await db.execute(sql`
    UPDATE "learning_resources"
    SET
      "knowledge_scope" = COALESCE("knowledge_scope", 'COURSE_PRIVATE'),
      "governance_state" = COALESCE("governance_state", 'COURSE_PRIVATE'),
      "retrieval_eligible" = COALESCE("retrieval_eligible", false)
    WHERE "origin" = 'lms_lesson_asset';
  `);

  await db.execute(sql`
    ALTER TABLE "knowledge_documents"
      ADD COLUMN IF NOT EXISTS "knowledge_scope" "public"."enum_knowledge_scope" DEFAULT 'OMNIA_APPROVED',
      ADD COLUMN IF NOT EXISTS "school_key" varchar,
      ADD COLUMN IF NOT EXISTS "governance_state" varchar,
      ADD COLUMN IF NOT EXISTS "retrieval_eligible" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "assessment_secret" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "content_version_hash" varchar;
  `);

  // Preserve existing official Hub knowledge as institutional (do not downgrade).
  await db.execute(sql`
    UPDATE "knowledge_documents"
    SET
      "knowledge_scope" = COALESCE("knowledge_scope", 'OMNIA_APPROVED'),
      "retrieval_eligible" = COALESCE("retrieval_eligible", true)
    WHERE "allow_ai_use" = true
       OR "publication_status" = 'published';
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "knowledge_governance_submissions" (
      "id" serial PRIMARY KEY,
      "title" varchar NOT NULL,
      "source_type" varchar NOT NULL,
      "source_id" varchar NOT NULL,
      "course_id" integer,
      "lesson_id" integer,
      "lesson_asset_id" integer,
      "learning_resource_id" integer,
      "knowledge_document_id" integer,
      "school_key" varchar NOT NULL,
      "owner_company_id" integer,
      "author_id" integer NOT NULL,
      "submitted_at" timestamptz,
      "content_version_hash" varchar NOT NULL,
      "approved_version_hash" varchar,
      "requested_scope" varchar NOT NULL DEFAULT 'SCHOOL_APPROVED',
      "knowledge_scope" varchar NOT NULL DEFAULT 'COURSE_PRIVATE',
      "governance_state" varchar NOT NULL DEFAULT 'COURSE_PRIVATE',
      "status_label" varchar,
      "retrieval_eligible" boolean DEFAULT false,
      "assessment_secret" boolean DEFAULT false,
      "review_note" varchar,
      "last_reviewer_id" integer,
      "reviewed_at" timestamptz,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "knowledge_governance_submissions_decisions" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY,
      "action" varchar NOT NULL,
      "from_state" varchar,
      "to_state" varchar,
      "scope" varchar,
      "reason" varchar,
      "actor_id" varchar,
      "at" timestamptz NOT NULL,
      "version_hash" varchar
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "kg_submissions_school_idx"
      ON "knowledge_governance_submissions" USING btree ("school_key");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "kg_submissions_state_idx"
      ON "knowledge_governance_submissions" USING btree ("governance_state");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "kg_submissions_source_idx"
      ON "knowledge_governance_submissions" USING btree ("source_type", "source_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "knowledge_governance_submissions_decisions";`);
  await db.execute(sql`DROP TABLE IF EXISTS "knowledge_governance_submissions";`);
  await db.execute(sql`
    ALTER TABLE "learning_resources"
      DROP COLUMN IF EXISTS "knowledge_scope",
      DROP COLUMN IF EXISTS "school_key",
      DROP COLUMN IF EXISTS "governance_state",
      DROP COLUMN IF EXISTS "retrieval_eligible",
      DROP COLUMN IF EXISTS "assessment_secret",
      DROP COLUMN IF EXISTS "content_version_hash";
  `);
  await db.execute(sql`
    ALTER TABLE "knowledge_documents"
      DROP COLUMN IF EXISTS "knowledge_scope",
      DROP COLUMN IF EXISTS "school_key",
      DROP COLUMN IF EXISTS "governance_state",
      DROP COLUMN IF EXISTS "retrieval_eligible",
      DROP COLUMN IF EXISTS "assessment_secret",
      DROP COLUMN IF EXISTS "content_version_hash";
  `);
}
