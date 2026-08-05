import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Hotfix Epic 04 — colunas de lock docs para embedding-records / search-sessions.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "embedding_records_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "search_sessions_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_embedding_records_fk"
        FOREIGN KEY ("embedding_records_id") REFERENCES "public"."embedding_records"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_search_sessions_fk"
        FOREIGN KEY ("search_sessions_id") REFERENCES "public"."search_sessions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_embedding_records_id_idx"
      ON "payload_locked_documents_rels" USING btree ("embedding_records_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_search_sessions_id_idx"
      ON "payload_locked_documents_rels" USING btree ("search_sessions_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_search_sessions_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_embedding_records_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_search_sessions_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_embedding_records_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "search_sessions_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "embedding_records_id";
  `);
}
