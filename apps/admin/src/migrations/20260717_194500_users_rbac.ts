import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Expande papéis RBAC e adiciona escopo organizacional (company/tenant).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE text USING "role"::text;
    DROP TYPE IF EXISTS "public"."enum_users_role";
    CREATE TYPE "public"."enum_users_role" AS ENUM(
      'super_admin',
      'admin',
      'editor',
      'partner',
      'instructor',
      'student'
    );
    ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "public"."enum_users_role"
      USING (
        CASE
          WHEN "role" = 'admin' THEN 'admin'::"public"."enum_users_role"
          WHEN "role" = 'editor' THEN 'editor'::"public"."enum_users_role"
          WHEN "role" = 'super_admin' THEN 'super_admin'::"public"."enum_users_role"
          WHEN "role" = 'partner' THEN 'partner'::"public"."enum_users_role"
          WHEN "role" = 'instructor' THEN 'instructor'::"public"."enum_users_role"
          WHEN "role" = 'student' THEN 'student'::"public"."enum_users_role"
          ELSE 'editor'::"public"."enum_users_role"
        END
      );
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."enum_users_role";

    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company_id" integer;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" integer;

    DO $$ BEGIN
      ALTER TABLE "users"
        ADD CONSTRAINT "users_company_id_companies_id_fk"
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "users"
        ADD CONSTRAINT "users_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "users_company_idx" ON "users" USING btree ("company_id");
    CREATE INDEX IF NOT EXISTS "users_tenant_idx" ON "users" USING btree ("tenant_id");

    -- Garante que o primeiro administrador existente continue com acesso total.
    UPDATE "users"
    SET "role" = 'super_admin'
    WHERE "id" = (
      SELECT "id" FROM "users" ORDER BY "id" ASC LIMIT 1
    )
    AND "role" IN ('admin'::"public"."enum_users_role", 'editor'::"public"."enum_users_role");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "users"
    SET "role" = 'admin'
    WHERE "role" IN ('super_admin', 'partner', 'instructor', 'student');

    ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_company_id_companies_id_fk";
    ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_tenant_id_tenants_id_fk";
    DROP INDEX IF EXISTS "users_company_idx";
    DROP INDEX IF EXISTS "users_tenant_idx";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "company_id";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "tenant_id";

    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE text USING "role"::text;
    DROP TYPE IF EXISTS "public"."enum_users_role";
    CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
    ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "public"."enum_users_role"
      USING (
        CASE
          WHEN "role" = 'editor' THEN 'editor'::"public"."enum_users_role"
          ELSE 'admin'::"public"."enum_users_role"
        END
      );
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."enum_users_role";
  `);
}
