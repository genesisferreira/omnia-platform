import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * HOTFIX P04 — alinhamento do schema de tags de CRM Companies.
 *
 * Causa: Payload 3 (drizzle) persiste `text` + `hasMany` em `{collection}_texts`
 * (colunas order/parent_id/path/text). A foundation criou `crm_companies_tags`
 * no formato legado `{field}`/`value`, gerando 503 em find/create com tags.
 *
 * Idempotente: safe em fresh install, upgrade e staging com estado atual.
 * Não altera migrations já aplicadas.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "crm_companies_texts" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "text" varchar
    );

    DO $$ BEGIN
      ALTER TABLE "crm_companies_texts"
        ADD CONSTRAINT "crm_companies_texts_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."crm_companies"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "crm_companies_texts_order_parent_idx"
      ON "crm_companies_texts" USING btree ("order", "parent_id");

    CREATE INDEX IF NOT EXISTS "crm_companies_texts_parent_idx"
      ON "crm_companies_texts" USING btree ("parent_id");

    CREATE INDEX IF NOT EXISTS "crm_companies_texts_path_idx"
      ON "crm_companies_texts" USING btree ("path");

    -- Preserva dados da tabela legada, se existir e ainda houver linhas.
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'crm_companies_tags'
      ) THEN
        INSERT INTO "crm_companies_texts" ("order", "parent_id", "path", "text")
        SELECT
          t."order",
          t."parent_id",
          'tags',
          t."value"
        FROM "crm_companies_tags" t
        WHERE NOT EXISTS (
          SELECT 1
          FROM "crm_companies_texts" x
          WHERE x."parent_id" = t."parent_id"
            AND x."order" = t."order"
            AND x."path" = 'tags'
            AND x."text" IS NOT DISTINCT FROM t."value"
        );

        DROP TABLE IF EXISTS "crm_companies_tags" CASCADE;
      END IF;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "crm_companies_tags" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" varchar,
      "id" serial PRIMARY KEY NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "crm_companies_tags"
        ADD CONSTRAINT "crm_companies_tags_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."crm_companies"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    INSERT INTO "crm_companies_tags" ("order", "parent_id", "value")
    SELECT
      x."order",
      x."parent_id",
      x."text"
    FROM "crm_companies_texts" x
    WHERE x."path" = 'tags'
      AND NOT EXISTS (
        SELECT 1
        FROM "crm_companies_tags" t
        WHERE t."parent_id" = x."parent_id"
          AND t."order" = x."order"
          AND t."value" IS NOT DISTINCT FROM x."text"
      );

    DROP TABLE IF EXISTS "crm_companies_texts" CASCADE;
  `);
}
