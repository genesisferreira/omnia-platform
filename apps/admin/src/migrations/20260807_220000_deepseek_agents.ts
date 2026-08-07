import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 09 — DeepSeek Live + official specialists: prompt compliance, categories, budget fields.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "public"."enum_ai_prompts_kind" ADD VALUE 'compliance';
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TYPE "public"."enum_ai_assistants_category" ADD VALUE 'refrigeration';
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TYPE "public"."enum_ai_assistants_category" ADD VALUE 'technology';
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TYPE "public"."enum_ai_assistants_category" ADD VALUE 'electrical';
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TYPE "public"."enum_ai_assistants_category" ADD VALUE 'assessor';
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TYPE "public"."enum_ai_assistants_category" ADD VALUE 'radar';
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TYPE "public"."enum_ai_assistants_category" ADD VALUE 'lab';
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TYPE "public"."enum_ai_assistants_category" ADD VALUE 'content';
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "deepseek_status" varchar DEFAULT 'unknown';
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "tokens_today" numeric DEFAULT 0;
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "tokens_month" numeric DEFAULT 0;
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "cost_today_usd" numeric DEFAULT 0;
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "cost_month_usd" numeric DEFAULT 0;
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "cost_by_assistant" jsonb;
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "cost_by_company" jsonb;
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "cost_by_course" jsonb;
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "provider_balance_note" varchar DEFAULT 'Saldo não disponibilizado pelo provider';
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "budget_daily_usd" numeric DEFAULT 25;
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "budget_monthly_usd" numeric DEFAULT 400;
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "budget_at100" varchar DEFAULT 'warn_only';
    ALTER TABLE "enterprise_ai_dashboard"
      ADD COLUMN IF NOT EXISTS "budget_status" jsonb;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "budget_status";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "budget_at100";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "budget_monthly_usd";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "budget_daily_usd";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "provider_balance_note";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "cost_by_course";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "cost_by_company";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "cost_by_assistant";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "cost_month_usd";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "cost_today_usd";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "tokens_month";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "tokens_today";
    ALTER TABLE "enterprise_ai_dashboard" DROP COLUMN IF EXISTS "deepseek_status";
  `);
}
