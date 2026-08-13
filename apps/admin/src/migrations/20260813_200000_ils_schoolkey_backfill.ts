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
      );

    UPDATE "companies"
    SET "school_key" = 'cte'
    WHERE "school_key" IS NULL
      AND (
        "brand_theme" = 'cte'
        OR "slug" = 'cte'
        OR "portal_slug" = 'cte'
      );

    UPDATE "courses" AS c
    SET "school_key" = co."school_key"
    FROM "companies" AS co
    WHERE c."owner_company_id" = co."id"
      AND c."school_key" IS NULL
      AND co."school_key" IS NOT NULL;

    UPDATE "courses"
    SET "school_key" = 'fred-do-frio'
    WHERE "school_key" IS NULL
      AND "slug" = 'fundamentos-refrigeracao-industrial';

    UPDATE "lms_classes" AS cl
    SET "school_key" = c."school_key"
    FROM "courses" AS c
    WHERE cl."course_id" = c."id"
      AND cl."school_key" IS NULL
      AND c."school_key" IS NOT NULL;

    UPDATE "lms_enrollments" AS e
    SET "school_key" = c."school_key"
    FROM "courses" AS c
    WHERE e."course_id" = c."id"
      AND e."school_key" IS NULL
      AND c."school_key" IS NOT NULL;

    UPDATE "lms_certificates" AS cert
    SET "school_key" = c."school_key"
    FROM "courses" AS c
    WHERE cert."course_id" = c."id"
      AND cert."school_key" IS NULL
      AND c."school_key" IS NOT NULL;

    UPDATE "ils_onboarding" AS o
    SET "school_key" = s."school_key"::"public"."enum_ils_onboarding_school_key"
    FROM (
      SELECT "student_id", MIN("school_key"::text) AS "school_key"
      FROM "lms_enrollments"
      WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
      GROUP BY "student_id"
      HAVING COUNT(DISTINCT "school_key") = 1
    ) AS s
    WHERE o."student_id" = s."student_id"
      AND o."school_key" IS NULL;

    UPDATE "ils_consents" AS c
    SET "school_key" = s."school_key"::"public"."enum_ils_consents_school_key"
    FROM (
      SELECT "student_id", MIN("school_key"::text) AS "school_key"
      FROM "lms_enrollments"
      WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
      GROUP BY "student_id"
      HAVING COUNT(DISTINCT "school_key") = 1
    ) AS s
    WHERE c."user_id" = s."student_id"
      AND c."school_key" IS NULL;

    UPDATE "ils_competency_history" AS h
    SET "school_key" = s."school_key"::"public"."enum_ils_competency_history_school_key"
    FROM (
      SELECT "student_id", MIN("school_key"::text) AS "school_key"
      FROM "lms_enrollments"
      WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
      GROUP BY "student_id"
      HAVING COUNT(DISTINCT "school_key") = 1
    ) AS s
    WHERE h."student_id" = s."student_id"
      AND h."school_key" IS NULL;

    UPDATE "ils_interventions" AS i
    SET "school_key" = s."school_key"::"public"."enum_ils_interventions_school_key"
    FROM (
      SELECT "student_id", MIN("school_key"::text) AS "school_key"
      FROM "lms_enrollments"
      WHERE "school_key" IS NOT NULL AND "status" <> 'cancelled'
      GROUP BY "student_id"
      HAVING COUNT(DISTINCT "school_key") = 1
    ) AS s
    WHERE i."student_id" = s."student_id"
      AND i."school_key" IS NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    SELECT 1;
  `);
}
