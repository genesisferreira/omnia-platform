import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * ILS V1.1 — schoolKey backfill versionado.
 * Cada collection tem ENUM próprio; copia via literal, nunca enum→enum.
 * NULL restante = legacy/unknown. Não inventa escola.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "companies"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND (
        "brand_theme" = 'fred'
        OR "slug" IN ('fred-do-frio', 'fred-do-frio-academy')
        OR "portal_slug" IN ('fred-do-frio', 'fred-do-frio-academy')
      )
  `);

  await db.execute(sql`
    UPDATE "companies"
    SET "school_key" = 'cte'
    WHERE "school_key" IS NULL
      AND (
        "brand_theme" = 'cte'
        OR "slug" = 'cte'
        OR "portal_slug" = 'cte'
      )
  `);

  await db.execute(sql`
    UPDATE "courses"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND (
        "slug" = 'fundamentos-refrigeracao-industrial'
        OR "owner_company_id" IN (
          SELECT "id" FROM "companies" WHERE "school_key" = 'fred-do-frio'
        )
      )
  `);

  await db.execute(sql`
    UPDATE "courses"
    SET "school_key" = 'cte'
    WHERE "school_key" IS NULL
      AND "owner_company_id" IN (
        SELECT "id" FROM "companies" WHERE "school_key" = 'cte'
      )
  `);

  await db.execute(sql`
    UPDATE "lms_classes"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND "course_id" IN (SELECT "id" FROM "courses" WHERE "school_key" = 'fred-do-frio')
  `);

  await db.execute(sql`
    UPDATE "lms_classes"
    SET "school_key" = 'cte'
    WHERE "school_key" IS NULL
      AND "course_id" IN (SELECT "id" FROM "courses" WHERE "school_key" = 'cte')
  `);

  await db.execute(sql`
    UPDATE "lms_enrollments"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND "course_id" IN (SELECT "id" FROM "courses" WHERE "school_key" = 'fred-do-frio')
  `);

  await db.execute(sql`
    UPDATE "lms_enrollments"
    SET "school_key" = 'cte'
    WHERE "school_key" IS NULL
      AND "course_id" IN (SELECT "id" FROM "courses" WHERE "school_key" = 'cte')
  `);

  await db.execute(sql`
    UPDATE "lms_certificates"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND "course_id" IN (SELECT "id" FROM "courses" WHERE "school_key" = 'fred-do-frio')
  `);

  await db.execute(sql`
    UPDATE "lms_certificates"
    SET "school_key" = 'cte'
    WHERE "school_key" IS NULL
      AND "course_id" IN (SELECT "id" FROM "courses" WHERE "school_key" = 'cte')
  `);

  await db.execute(sql`
    UPDATE "ils_onboarding"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND "student_id" IN (
        SELECT "student_id" FROM "lms_enrollments"
        WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
        GROUP BY "student_id"
        HAVING COUNT(DISTINCT CAST("school_key" AS text)) = 1
           AND MIN(CAST("school_key" AS text)) = 'fred-do-frio'
      )
  `);

  await db.execute(sql`
    UPDATE "ils_onboarding"
    SET "school_key" = 'cte'
    WHERE "school_key" IS NULL
      AND "student_id" IN (
        SELECT "student_id" FROM "lms_enrollments"
        WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
        GROUP BY "student_id"
        HAVING COUNT(DISTINCT CAST("school_key" AS text)) = 1
           AND MIN(CAST("school_key" AS text)) = 'cte'
      )
  `);

  await db.execute(sql`
    UPDATE "ils_consents"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND "user_id" IN (
        SELECT "student_id" FROM "lms_enrollments"
        WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
        GROUP BY "student_id"
        HAVING COUNT(DISTINCT CAST("school_key" AS text)) = 1
           AND MIN(CAST("school_key" AS text)) = 'fred-do-frio'
      )
  `);

  await db.execute(sql`
    UPDATE "ils_consents"
    SET "school_key" = 'cte'
    WHERE "school_key" IS NULL
      AND "user_id" IN (
        SELECT "student_id" FROM "lms_enrollments"
        WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
        GROUP BY "student_id"
        HAVING COUNT(DISTINCT CAST("school_key" AS text)) = 1
           AND MIN(CAST("school_key" AS text)) = 'cte'
      )
  `);

  await db.execute(sql`
    UPDATE "ils_competency_history"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND "student_id" IN (
        SELECT "student_id" FROM "lms_enrollments"
        WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
        GROUP BY "student_id"
        HAVING COUNT(DISTINCT CAST("school_key" AS text)) = 1
           AND MIN(CAST("school_key" AS text)) = 'fred-do-frio'
      )
  `);

  await db.execute(sql`
    UPDATE "ils_competency_history"
    SET "school_key" = 'cte'
    WHERE "school_key" IS NULL
      AND "student_id" IN (
        SELECT "student_id" FROM "lms_enrollments"
        WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
        GROUP BY "student_id"
        HAVING COUNT(DISTINCT CAST("school_key" AS text)) = 1
           AND MIN(CAST("school_key" AS text)) = 'cte'
      )
  `);

  await db.execute(sql`
    UPDATE "ils_interventions"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND "student_id" IN (
        SELECT "student_id" FROM "lms_enrollments"
        WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
        GROUP BY "student_id"
        HAVING COUNT(DISTINCT CAST("school_key" AS text)) = 1
           AND MIN(CAST("school_key" AS text)) = 'fred-do-frio'
      )
  `);

  await db.execute(sql`
    UPDATE "ils_interventions"
    SET "school_key" = 'cte'
    WHERE "school_key" IS NULL
      AND "student_id" IN (
        SELECT "student_id" FROM "lms_enrollments"
        WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
        GROUP BY "student_id"
        HAVING COUNT(DISTINCT CAST("school_key" AS text)) = 1
           AND MIN(CAST("school_key" AS text)) = 'cte'
      )
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`SELECT 1`);
}
