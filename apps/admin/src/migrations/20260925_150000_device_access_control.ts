import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Device Access Control (V1) — somente ADITIVA e idempotente (IF NOT EXISTS / ON CONFLICT).
 * - cria `student_devices`, `device_access_requests`, global `device_access_settings`;
 * - persiste o default seguro enabled=false (linha única do global);
 * - adiciona `users.max_devices_override` (nullable; NÃO toca dados de usuários);
 * - adiciona as colunas de lock-rels exigidas pelo Payload para as novas coleções.
 * Não altera usuários, sessões, matrículas, progresso, onboarding, cursos ou conhecimento.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "max_devices_override" numeric;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "device_access_settings" (
      "id" serial PRIMARY KEY,
      "enabled" boolean DEFAULT false,
      "default_max_devices" numeric DEFAULT 2 NOT NULL,
      "updated_by_id" integer,
      "updated_at" timestamptz,
      "created_at" timestamptz
    );
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "device_access_settings"
        ADD CONSTRAINT "device_access_settings_updated_by_id_users_id_fk"
        FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "device_access_settings_updated_by_idx"
      ON "device_access_settings" USING btree ("updated_by_id");
  `);
  // Default persistido e seguro: desligado. Nunca sobrescreve uma linha existente.
  await db.execute(sql`
    INSERT INTO "device_access_settings" ("enabled", "default_max_devices", "updated_at", "created_at")
    SELECT false, 2, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM "device_access_settings");
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "student_devices" (
      "id" serial PRIMARY KEY,
      "student_id" integer NOT NULL,
      "token_hash" varchar NOT NULL,
      "label" varchar NOT NULL,
      "device_type" varchar DEFAULT 'unknown' NOT NULL,
      "status" varchar DEFAULT 'PENDING' NOT NULL,
      "approved_via" varchar,
      "approved_by_id" integer,
      "company_id" integer,
      "tenant_id" integer,
      "last_seen_at" timestamptz,
      "revoked_at" timestamptz,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "device_access_requests" (
      "id" serial PRIMARY KEY,
      "student_id" integer NOT NULL,
      "device_id" integer NOT NULL,
      "reason" varchar NOT NULL,
      "status" varchar DEFAULT 'PENDING' NOT NULL,
      "reviewed_by_id" integer,
      "reviewed_at" timestamptz,
      "review_note" varchar,
      "company_id" integer,
      "tenant_id" integer,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL
    );
  `);

  const fks: Array<[string, string, string, string, string]> = [
    ['student_devices', 'student_devices_student_id_users_id_fk', 'student_id', 'users', 'cascade'],
    ['student_devices', 'student_devices_approved_by_id_users_id_fk', 'approved_by_id', 'users', 'set null'],
    ['student_devices', 'student_devices_company_id_companies_id_fk', 'company_id', 'companies', 'set null'],
    ['student_devices', 'student_devices_tenant_id_tenants_id_fk', 'tenant_id', 'tenants', 'set null'],
    ['device_access_requests', 'device_access_requests_student_id_users_id_fk', 'student_id', 'users', 'cascade'],
    ['device_access_requests', 'device_access_requests_device_id_student_devices_id_fk', 'device_id', 'student_devices', 'cascade'],
    ['device_access_requests', 'device_access_requests_reviewed_by_id_users_id_fk', 'reviewed_by_id', 'users', 'set null'],
    ['device_access_requests', 'device_access_requests_company_id_companies_id_fk', 'company_id', 'companies', 'set null'],
    ['device_access_requests', 'device_access_requests_tenant_id_tenants_id_fk', 'tenant_id', 'tenants', 'set null'],
  ];
  for (const [table, name, column, ref, onDelete] of fks) {
    await db.execute(
      sql.raw(`
        DO $$ BEGIN
          ALTER TABLE "${table}" ADD CONSTRAINT "${name}"
            FOREIGN KEY ("${column}") REFERENCES "public"."${ref}"("id") ON DELETE ${onDelete} ON UPDATE no action;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `),
    );
  }

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "student_devices_token_hash_idx"
      ON "student_devices" USING btree ("token_hash");
    CREATE INDEX IF NOT EXISTS "student_devices_student_idx" ON "student_devices" USING btree ("student_id");
    CREATE INDEX IF NOT EXISTS "student_devices_status_idx" ON "student_devices" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "student_devices_approved_by_idx" ON "student_devices" USING btree ("approved_by_id");
    CREATE INDEX IF NOT EXISTS "student_devices_company_idx" ON "student_devices" USING btree ("company_id");
    CREATE INDEX IF NOT EXISTS "student_devices_tenant_idx" ON "student_devices" USING btree ("tenant_id");
    CREATE INDEX IF NOT EXISTS "student_devices_updated_at_idx" ON "student_devices" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "student_devices_created_at_idx" ON "student_devices" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "student_devices_student_status_idx" ON "student_devices" USING btree ("student_id", "status");
    CREATE INDEX IF NOT EXISTS "device_access_requests_student_idx" ON "device_access_requests" USING btree ("student_id");
    CREATE INDEX IF NOT EXISTS "device_access_requests_device_idx" ON "device_access_requests" USING btree ("device_id");
    CREATE INDEX IF NOT EXISTS "device_access_requests_status_idx" ON "device_access_requests" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "device_access_requests_reviewed_by_idx" ON "device_access_requests" USING btree ("reviewed_by_id");
    CREATE INDEX IF NOT EXISTS "device_access_requests_company_idx" ON "device_access_requests" USING btree ("company_id");
    CREATE INDEX IF NOT EXISTS "device_access_requests_tenant_idx" ON "device_access_requests" USING btree ("tenant_id");
    CREATE INDEX IF NOT EXISTS "device_access_requests_updated_at_idx" ON "device_access_requests" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "device_access_requests_created_at_idx" ON "device_access_requests" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "device_access_requests_one_pending_per_device_idx"
      ON "device_access_requests" USING btree ("device_id") WHERE "status" = 'PENDING';
  `);

  // Payload document locking: coluna por coleção em payload_locked_documents_rels.
  for (const [col, table, idx, fk] of [
    ['student_devices_id', 'student_devices', 'payload_locked_documents_rels_student_devices_id_idx', 'payload_locked_documents_rels_student_devices_fk'],
    ['device_access_requests_id', 'device_access_requests', 'payload_locked_documents_rels_device_access_requests_id_idx', 'payload_locked_documents_rels_device_access_requests_fk'],
  ] as const) {
    await db.execute(sql.raw(`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "${col}" integer;`));
    await db.execute(
      sql.raw(`
        DO $$ BEGIN
          ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "${fk}"
            FOREIGN KEY ("${col}") REFERENCES "public"."${table}"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `),
    );
    await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "${idx}" ON "payload_locked_documents_rels" USING btree ("${col}");`));
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "student_devices_id",
      DROP COLUMN IF EXISTS "device_access_requests_id";
  `);
  await db.execute(sql`DROP TABLE IF EXISTS "device_access_requests";`);
  await db.execute(sql`DROP TABLE IF EXISTS "student_devices";`);
  await db.execute(sql`DROP TABLE IF EXISTS "device_access_settings";`);
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "max_devices_override";`);
}
