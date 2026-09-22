import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Sprint 2.5 ME01 — LMS Connector foundation:
 * - lms-identity-links (vínculo Omnia ↔ Moodle)
 * - lms-audit-events (auditoria políticas/sessões)
 * - global lms-settings (limites de sessão / flags)
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_lms_identity_links_status" AS ENUM(
        'active',
        'inactive',
        'pending',
        'error'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_lms_identity_links_sync_status" AS ENUM(
        'never',
        'synced',
        'stale',
        'error'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "lms_identity_links" (
      "id" serial PRIMARY KEY NOT NULL,
      "omnia_user_id" varchar NOT NULL,
      "moodle_user_id" numeric NOT NULL,
      "moodle_username" varchar,
      "status" "public"."enum_lms_identity_links_status" DEFAULT 'active' NOT NULL,
      "linked_at" timestamp(3) with time zone,
      "last_synced_at" timestamp(3) with time zone,
      "sync_status" "public"."enum_lms_identity_links_sync_status" DEFAULT 'never',
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "lms_identity_links_omnia_user_id_idx"
      ON "lms_identity_links" USING btree ("omnia_user_id");
    CREATE INDEX IF NOT EXISTS "lms_identity_links_moodle_user_id_idx"
      ON "lms_identity_links" USING btree ("moodle_user_id");
    CREATE INDEX IF NOT EXISTS "lms_identity_links_updated_at_idx"
      ON "lms_identity_links" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "lms_identity_links_created_at_idx"
      ON "lms_identity_links" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "lms_audit_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "action" varchar NOT NULL,
      "actor_id" varchar NOT NULL,
      "target_user_id" varchar,
      "previous_value" jsonb,
      "new_value" jsonb,
      "reason" varchar,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "lms_audit_events_action_idx"
      ON "lms_audit_events" USING btree ("action");
    CREATE INDEX IF NOT EXISTS "lms_audit_events_actor_id_idx"
      ON "lms_audit_events" USING btree ("actor_id");
    CREATE INDEX IF NOT EXISTS "lms_audit_events_target_user_id_idx"
      ON "lms_audit_events" USING btree ("target_user_id");
    CREATE INDEX IF NOT EXISTS "lms_audit_events_updated_at_idx"
      ON "lms_audit_events" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "lms_audit_events_created_at_idx"
      ON "lms_audit_events" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "lms_settings" (
      "id" serial PRIMARY KEY NOT NULL,
      "connector_enabled" boolean DEFAULT false,
      "connector_read_only" boolean DEFAULT true,
      "session_policy_enabled" boolean DEFAULT true,
      "default_student_sessions" numeric DEFAULT 1,
      "default_teacher_sessions" numeric DEFAULT 2,
      "default_manager_sessions" numeric DEFAULT 2,
      "default_admin_sessions" numeric DEFAULT 2,
      "revoke_oldest_on_exceed" boolean DEFAULT true,
      "session_ttl_seconds" numeric DEFAULT 28800,
      "session_heartbeat_seconds" numeric DEFAULT 60,
      "downloads_allowed_default" boolean DEFAULT false,
      "watermark_enabled_default" boolean DEFAULT true,
      "media_ttl_seconds_default" numeric DEFAULT 300,
      "change_reason" varchar,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "lms_identity_links_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "lms_audit_events_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_lms_identity_links_fk"
        FOREIGN KEY ("lms_identity_links_id") REFERENCES "public"."lms_identity_links"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_lms_audit_events_fk"
        FOREIGN KEY ("lms_audit_events_id") REFERENCES "public"."lms_audit_events"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_lms_identity_links_id_idx"
      ON "payload_locked_documents_rels" USING btree ("lms_identity_links_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_lms_audit_events_id_idx"
      ON "payload_locked_documents_rels" USING btree ("lms_audit_events_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_lms_identity_links_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_lms_audit_events_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_lms_identity_links_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_lms_audit_events_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_identity_links_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "lms_audit_events_id";

    DROP TABLE IF EXISTS "lms_settings" CASCADE;
    DROP TABLE IF EXISTS "lms_audit_events" CASCADE;
    DROP TABLE IF EXISTS "lms_identity_links" CASCADE;

    DROP TYPE IF EXISTS "public"."enum_lms_identity_links_sync_status";
    DROP TYPE IF EXISTS "public"."enum_lms_identity_links_status";
  `);
}
