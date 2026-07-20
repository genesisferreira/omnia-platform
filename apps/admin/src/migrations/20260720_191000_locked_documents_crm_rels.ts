import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * HOTFIX P04 — versiona colunas de relação CRM em payload_locked_documents_rels.
 *
 * Em staging essas colunas foram aplicadas via ALTER manual. Esta migration
 * é idempotente (IF NOT EXISTS / exception handlers) e funciona em:
 * - banco limpo (fresh install)
 * - upgrade real pós identity CRM
 * - staging já alterado manualmente
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "organizations_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "crm_companies_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "contacts_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "leads_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "activities_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_organizations_fk"
        FOREIGN KEY ("organizations_id") REFERENCES "public"."organizations"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_crm_companies_fk"
        FOREIGN KEY ("crm_companies_id") REFERENCES "public"."crm_companies"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_contacts_fk"
        FOREIGN KEY ("contacts_id") REFERENCES "public"."contacts"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_leads_fk"
        FOREIGN KEY ("leads_id") REFERENCES "public"."leads"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_activities_fk"
        FOREIGN KEY ("activities_id") REFERENCES "public"."activities"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_organizations_id_idx"
      ON "payload_locked_documents_rels" USING btree ("organizations_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_crm_companies_id_idx"
      ON "payload_locked_documents_rels" USING btree ("crm_companies_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_contacts_id_idx"
      ON "payload_locked_documents_rels" USING btree ("contacts_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_leads_id_idx"
      ON "payload_locked_documents_rels" USING btree ("leads_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_activities_id_idx"
      ON "payload_locked_documents_rels" USING btree ("activities_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_organizations_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_crm_companies_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_contacts_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_leads_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_activities_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_organizations_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_crm_companies_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_contacts_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_leads_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_activities_id_idx";

    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "organizations_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "crm_companies_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "contacts_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "leads_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "activities_id";
  `);
}
