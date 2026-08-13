import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * ILS V1.1 — schoolKey backfill versionado.
 * Só preenche com evidência (brandTheme/slug/owner/course). NULL restante = legacy/unknown.
 * Não inventa escola.
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
    UPDATE "courses" AS c
    SET "school_key" = co."school_key"
    FROM "companies" AS co
    WHERE c."owner_company_id" = co."id"
      AND c."school_key" IS NULL
      AND co."school_key" IS NOT NULL
  `);

  await db.execute(sql`
    UPDATE "courses"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND "slug" = 'fundamentos-refrigeracao-industrial'
  `);

  await db.execute(sql`
    UPDATE "lms_classes" AS cl
    SET "school_key" = c."school_key"
    FROM "courses" AS c
    WHERE cl."course_id" = c."id"
      AND cl."school_key" IS NULL
      AND c."school_key" IS NOT NULL
  `);

  await db.execute(sql`
    UPDATE "lms_enrollments" AS e
    SET "school_key" = c."school_key"
    FROM "courses" AS c
    WHERE e."course_id" = c."id"
      AND e."school_key" IS NULL
      AND c."school_key" IS NOT NULL
  `);

  await db.execute(sql`
    UPDATE "lms_certificates" AS cert
    SET "school_key" = c."school_key"
    FROM "courses" AS c
    WHERE cert."course_id" = c."id"
      AND cert."school_key" IS NULL
      AND c."school_key" IS NOT NULL
  `);

  await db.execute(sql`
    UPDATE "ils_onboarding"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND "student_id" IN (
        SELECT "student_id" FROM "lms_enrollments"
        WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
        GROUP BY "student_id"
        HAVING COUNT(DISTINCT "school_key") = 1
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
        HAVING COUNT(DISTINCT "school_key") = 1
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
        HAVING COUNT(DISTINCT "school_key") = 1
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
        HAVING COUNT(DISTINCT "school_key") = 1
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
        HAVING COUNT(DISTINCT "school_key") = 1
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
        HAVING COUNT(DISTINCT "school_key") = 1
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
        HAVING COUNT(DISTINCT "school_key") = 1
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
        HAVING COUNT(DISTINCT "school_key") = 1
           AND MIN(CAST("school_key" AS text)) = 'cte'
      )
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`SELECT 1`);
}
