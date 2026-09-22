import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 11 — gap-close Enterprise AI: assistant fields, prompt status, policy flags, dashboard.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_ai_assistants_category" ADD VALUE 'concierge';
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TYPE "public"."enum_ai_assistants_category" ADD VALUE 'evaluator';
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_ai_assistants_visibility" AS ENUM(
        'public','internal','restricted'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_ai_prompts_status" AS ENUM(
        'draft','active','retired'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "ai_assistants"
      ADD COLUMN IF NOT EXISTS "slug" varchar;
    ALTER TABLE "ai_assistants"
      ADD COLUMN IF NOT EXISTS "avatar" varchar;
    ALTER TABLE "ai_assistants"
      ADD COLUMN IF NOT EXISTS "color" varchar;
    ALTER TABLE "ai_assistants"
      ADD COLUMN IF NOT EXISTS "visibility" "public"."enum_ai_assistants_visibility" DEFAULT 'public';
    ALTER TABLE "ai_assistants"
      ADD COLUMN IF NOT EXISTS "prompt_version" varchar;
    ALTER TABLE "ai_assistants"
      ADD COLUMN IF NOT EXISTS "model_profile" varchar;

    UPDATE "ai_assistants" SET "slug" = "key" WHERE "slug" IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "ai_assistants_slug_idx" ON "ai_assistants" USING btree ("slug");

    ALTER TABLE "ai_prompts"
      ADD COLUMN IF NOT EXISTS "author" varchar;
    ALTER TABLE "ai_prompts"
      ADD COLUMN IF NOT EXISTS "status" "public"."enum_ai_prompts_status" DEFAULT 'active';
    UPDATE "ai_prompts" SET "status" = CASE
      WHEN "active" IS TRUE THEN 'active'::"public"."enum_ai_prompts_status"
      ELSE 'retired'::"public"."enum_ai_prompts_status"
    END
    WHERE "status" IS NULL OR "status" = 'active';

    ALTER TABLE "ai_policies"
      ADD COLUMN IF NOT EXISTS "require_grounding" boolean DEFAULT true;
    ALTER TABLE "ai_policies"
      ADD COLUMN IF NOT EXISTS "require_explainability" boolean DEFAULT true;
    ALTER TABLE "ai_policies"
      ADD COLUMN IF NOT EXISTS "max_tokens_per_day" numeric;

    ALTER TABLE "ai_models"
      ADD COLUMN IF NOT EXISTS "default_temperature" numeric DEFAULT 0.2;

    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "active_assistants_count" numeric DEFAULT 0;
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "usage_by_provider" jsonb;
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "satisfaction_score" numeric DEFAULT 0;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "satisfaction_score";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "usage_by_provider";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "active_assistants_count";
    ALTER TABLE "ai_models" DROP COLUMN IF EXISTS "default_temperature";
    ALTER TABLE "ai_policies" DROP COLUMN IF EXISTS "max_tokens_per_day";
    ALTER TABLE "ai_policies" DROP COLUMN IF EXISTS "require_explainability";
    ALTER TABLE "ai_policies" DROP COLUMN IF EXISTS "require_grounding";
    ALTER TABLE "ai_prompts" DROP COLUMN IF EXISTS "status";
    ALTER TABLE "ai_prompts" DROP COLUMN IF EXISTS "author";
    DROP INDEX IF EXISTS "ai_assistants_slug_idx";
    ALTER TABLE "ai_assistants" DROP COLUMN IF EXISTS "model_profile";
    ALTER TABLE "ai_assistants" DROP COLUMN IF EXISTS "prompt_version";
    ALTER TABLE "ai_assistants" DROP COLUMN IF EXISTS "visibility";
    ALTER TABLE "ai_assistants" DROP COLUMN IF EXISTS "color";
    ALTER TABLE "ai_assistants" DROP COLUMN IF EXISTS "avatar";
    ALTER TABLE "ai_assistants" DROP COLUMN IF EXISTS "slug";
    DROP TYPE IF EXISTS "public"."enum_ai_prompts_status";
    DROP TYPE IF EXISTS "public"."enum_ai_assistants_visibility";
  `);
}
