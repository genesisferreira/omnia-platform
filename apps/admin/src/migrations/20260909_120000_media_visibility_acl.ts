import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * RC2.2 — Media scoped visibility + school/tenant fields.
 * Unclassified academic Media defaults to private (never silent public).
 * Lesson-linked Media backfilled to school + course.school_key when available.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_media_visibility" AS ENUM('public', 'school', 'tenant', 'private');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await db.execute(sql`
    ALTER TABLE "media"
      ADD COLUMN IF NOT EXISTS "visibility" "public"."enum_media_visibility" DEFAULT 'private',
      ADD COLUMN IF NOT EXISTS "school_key" varchar,
      ADD COLUMN IF NOT EXISTS "owner_company_id" integer,
      ADD COLUMN IF NOT EXISTS "uploaded_by_id" integer;
  `);

  await db.execute(sql`
    UPDATE "media" SET "visibility" = 'private' WHERE "visibility" IS NULL;
  `);

  // Academic material attached to lessons → school scope + course schoolKey.
  await db.execute(sql`
    UPDATE "media" AS m
    SET
      "visibility" = 'school',
      "school_key" = c."school_key",
      "owner_company_id" = COALESCE(m."owner_company_id", c."owner_company_id")
    FROM "lesson_assets" la
    JOIN "lessons" l ON l."id" = la."lesson_id"
    JOIN "course_modules" cm ON cm."id" = l."module_id"
    JOIN "courses" c ON c."id" = cm."course_id"
    WHERE la."media_id" = m."id"
      AND c."school_key" IS NOT NULL;
  `);

  // Learning resources (KI) → private academic unless already school.
  await db.execute(sql`
    UPDATE "media" AS m
    SET "visibility" = 'private'
    FROM "learning_resources" lr
    WHERE lr."media_id" = m."id"
      AND (m."visibility" IS NULL OR m."visibility" = 'private');
  `);

  // Explicit public CMS: company logos / OG / covers stay public when referenced.
  await db.execute(sql`
    UPDATE "media" AS m
    SET "visibility" = 'public'
    WHERE m."id" IN (
      SELECT "logo_id" FROM "companies" WHERE "logo_id" IS NOT NULL
      UNION
      SELECT "cover_image_id" FROM "companies" WHERE "cover_image_id" IS NOT NULL
      UNION
      SELECT "seo_open_graph_image_id" FROM "companies" WHERE "seo_open_graph_image_id" IS NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "media_visibility_idx" ON "media" USING btree ("visibility");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "media_school_key_idx" ON "media" USING btree ("school_key");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "media_owner_company_idx" ON "media" USING btree ("owner_company_id");
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");
  `);

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "media"
        ADD CONSTRAINT "media_owner_company_id_companies_id_fk"
        FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "media"
        ADD CONSTRAINT "media_uploaded_by_id_users_id_fk"
        FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_owner_company_id_companies_id_fk";
  `);
  await db.execute(sql`
    ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_uploaded_by_id_users_id_fk";
  `);
  await db.execute(sql`DROP INDEX IF EXISTS "media_visibility_idx";`);
  await db.execute(sql`DROP INDEX IF EXISTS "media_school_key_idx";`);
  await db.execute(sql`DROP INDEX IF EXISTS "media_owner_company_idx";`);
  await db.execute(sql`DROP INDEX IF EXISTS "media_uploaded_by_idx";`);
  await db.execute(sql`
    ALTER TABLE "media"
      DROP COLUMN IF EXISTS "visibility",
      DROP COLUMN IF EXISTS "school_key",
      DROP COLUMN IF EXISTS "owner_company_id",
      DROP COLUMN IF EXISTS "uploaded_by_id";
  `);
  await db.execute(sql`DROP TYPE IF EXISTS "public"."enum_media_visibility";`);
}
