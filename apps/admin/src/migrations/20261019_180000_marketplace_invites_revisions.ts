import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Marketplace B2B Fase A — convites de equipe, trilha de auditoria, revisões moderadas de
 * anúncios publicados e dados do cadastro de fornecedor. Somente aditiva e idempotente.
 * Em `partners` (Rede de Parceiros) só acrescenta duas colunas opcionais.
 */

const LISTINGS = ['partner_product_listings', 'partner_service_listings'] as const;

function fk(table: string, column: string, ref: string, onDelete: string, name: string): string {
  return `
    DO $$ BEGIN
      ALTER TABLE "${table}" ADD CONSTRAINT "${name}"
        FOREIGN KEY ("${column}") REFERENCES "public"."${ref}"("id") ON DELETE ${onDelete} ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`;
}

const idx = (name: string, table: string, columns: string, unique = false) =>
  `CREATE ${unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS "${name}" ON "${table}" USING btree (${columns});`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(
    sql.raw(`
    ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "contact_name" varchar;
    ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "marketplace_intent" varchar DEFAULT 'none';

    CREATE TABLE IF NOT EXISTS "partner_invitations" (
      "id" serial PRIMARY KEY NOT NULL,
      "partner_id" integer NOT NULL,
      "email" varchar NOT NULL,
      "role" varchar NOT NULL,
      "status" varchar DEFAULT 'pending' NOT NULL,
      "token_hash" varchar NOT NULL,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "invited_by_id" integer,
      "accepted_by_id" integer,
      "accepted_at" timestamp(3) with time zone,
      "revoked_by_id" integer,
      "revoked_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "marketplace_audit_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "type" varchar NOT NULL,
      "partner_id" integer,
      "actor_id" integer,
      "subject_user_id" integer,
      "target_collection" varchar,
      "target_id" varchar,
      "data" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ${fk('partner_invitations', 'partner_id', 'partners', 'cascade', 'partner_invitations_partner_id_partners_id_fk')}
    ${fk('partner_invitations', 'invited_by_id', 'users', 'set null', 'partner_invitations_invited_by_id_users_id_fk')}
    ${fk('partner_invitations', 'accepted_by_id', 'users', 'set null', 'partner_invitations_accepted_by_id_users_id_fk')}
    ${fk('partner_invitations', 'revoked_by_id', 'users', 'set null', 'partner_invitations_revoked_by_id_users_id_fk')}
    ${fk('marketplace_audit_events', 'partner_id', 'partners', 'set null', 'marketplace_audit_events_partner_id_partners_id_fk')}
    ${fk('marketplace_audit_events', 'actor_id', 'users', 'set null', 'marketplace_audit_events_actor_id_users_id_fk')}
    ${fk('marketplace_audit_events', 'subject_user_id', 'users', 'set null', 'marketplace_audit_events_subject_user_id_users_id_fk')}

    ${idx('partner_invitations_partner_idx', 'partner_invitations', '"partner_id"')}
    ${idx('partner_invitations_email_idx', 'partner_invitations', '"email"')}
    ${idx('partner_invitations_status_idx', 'partner_invitations', '"status"')}
    ${idx('partner_invitations_token_hash_idx', 'partner_invitations', '"token_hash"', true)}
    ${idx('partner_invitations_invited_by_idx', 'partner_invitations', '"invited_by_id"')}
    ${idx('partner_invitations_accepted_by_idx', 'partner_invitations', '"accepted_by_id"')}
    ${idx('partner_invitations_revoked_by_idx', 'partner_invitations', '"revoked_by_id"')}
    ${idx('partner_invitations_updated_at_idx', 'partner_invitations', '"updated_at"')}
    ${idx('partner_invitations_created_at_idx', 'partner_invitations', '"created_at"')}
    ${idx('marketplace_audit_events_type_idx', 'marketplace_audit_events', '"type"')}
    ${idx('marketplace_audit_events_partner_idx', 'marketplace_audit_events', '"partner_id"')}
    ${idx('marketplace_audit_events_actor_idx', 'marketplace_audit_events', '"actor_id"')}
    ${idx('marketplace_audit_events_subject_user_idx', 'marketplace_audit_events', '"subject_user_id"')}
    ${idx('marketplace_audit_events_target_collection_idx', 'marketplace_audit_events', '"target_collection"')}
    ${idx('marketplace_audit_events_target_id_idx', 'marketplace_audit_events', '"target_id"')}
    ${idx('marketplace_audit_events_updated_at_idx', 'marketplace_audit_events', '"updated_at"')}
    ${idx('marketplace_audit_events_created_at_idx', 'marketplace_audit_events', '"created_at"')}

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "partner_invitations_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "marketplace_audit_events_id" integer;
    ${fk('payload_locked_documents_rels', 'partner_invitations_id', 'partner_invitations', 'cascade', 'payload_locked_documents_rels_partner_invitations_fk')}
    ${fk('payload_locked_documents_rels', 'marketplace_audit_events_id', 'marketplace_audit_events', 'cascade', 'payload_locked_documents_rels_marketplace_audit_events_fk')}
    ${idx('payload_locked_documents_rels_partner_invitations_id_idx', 'payload_locked_documents_rels', '"partner_invitations_id"')}
    ${idx('payload_locked_documents_rels_marketplace_audit_events_id_idx', 'payload_locked_documents_rels', '"marketplace_audit_events_id"')}
  `),
  );

  for (const table of LISTINGS) {
    await db.execute(
      sql.raw(`
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "revision_status" varchar DEFAULT 'none';
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "revision_notes" varchar;
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "pending_revision" jsonb;
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "revision_submitted_at" timestamp(3) with time zone;
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "revision_submitted_by_id" integer;
      ${fk(table, 'revision_submitted_by_id', 'users', 'set null', `${table}_revision_by_fk`)}
      ${idx(`${table}_revision_status_idx`, table, '"revision_status"')}
      ${idx(`${table}_revision_submitted_by_idx`, table, '"revision_submitted_by_id"')}
    `),
    );
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const table of LISTINGS) {
    await db.execute(
      sql.raw(`
      ALTER TABLE "${table}" DROP COLUMN IF EXISTS "revision_submitted_by_id";
      ALTER TABLE "${table}" DROP COLUMN IF EXISTS "revision_submitted_at";
      ALTER TABLE "${table}" DROP COLUMN IF EXISTS "pending_revision";
      ALTER TABLE "${table}" DROP COLUMN IF EXISTS "revision_notes";
      ALTER TABLE "${table}" DROP COLUMN IF EXISTS "revision_status";
    `),
    );
  }
  await db.execute(
    sql.raw(`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "marketplace_audit_events_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "partner_invitations_id";
    DROP TABLE IF EXISTS "marketplace_audit_events";
    DROP TABLE IF EXISTS "partner_invitations";
    ALTER TABLE "partners" DROP COLUMN IF EXISTS "marketplace_intent";
    ALTER TABLE "partners" DROP COLUMN IF EXISTS "contact_name";
  `),
  );
}
