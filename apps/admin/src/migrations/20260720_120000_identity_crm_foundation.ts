import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Release 2.1 — Identity + CRM Foundation:
 * - role client + accountStatus + perfil Users
 * - organizations, crm-companies, contacts, leads, activities
 * - companies.application_url
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Users: expand role enum with client
    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE text USING "role"::text;
    DROP TYPE IF EXISTS "public"."enum_users_role";
    CREATE TYPE "public"."enum_users_role" AS ENUM(
      'super_admin',
      'admin',
      'editor',
      'partner',
      'instructor',
      'student',
      'client'
    );
    ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "public"."enum_users_role"
      USING (
        CASE
          WHEN "role" = 'super_admin' THEN 'super_admin'::"public"."enum_users_role"
          WHEN "role" = 'admin' THEN 'admin'::"public"."enum_users_role"
          WHEN "role" = 'editor' THEN 'editor'::"public"."enum_users_role"
          WHEN "role" = 'partner' THEN 'partner'::"public"."enum_users_role"
          WHEN "role" = 'instructor' THEN 'instructor'::"public"."enum_users_role"
          WHEN "role" = 'student' THEN 'student'::"public"."enum_users_role"
          WHEN "role" = 'client' THEN 'client'::"public"."enum_users_role"
          ELSE 'client'::"public"."enum_users_role"
        END
      );
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'client'::"public"."enum_users_role";

    CREATE TYPE "public"."enum_users_account_status" AS ENUM('active', 'pending', 'blocked');

    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cpf" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "photo_id" integer;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employer_name" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "job_title" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "segment" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" varchar DEFAULT 'Brasil';
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" varchar;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_status" "public"."enum_users_account_status" DEFAULT 'pending';
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lgpd_accepted" boolean DEFAULT false;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lgpd_accepted_at" timestamp(3) with time zone;

    UPDATE "users"
    SET "account_status" = 'active'
    WHERE "role" IN ('super_admin', 'admin', 'editor')
      AND ("account_status" IS NULL OR "account_status" = 'pending');

    DO $$ BEGIN
      ALTER TABLE "users"
        ADD CONSTRAINT "users_photo_id_media_id_fk"
        FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "users_interest_areas" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" varchar,
      "id" serial PRIMARY KEY NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "users_interest_areas"
        ADD CONSTRAINT "users_interest_areas_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- Organizations
    CREATE TYPE "public"."enum_organizations_type" AS ENUM('holding', 'vertical', 'product', 'education');

    CREATE TABLE IF NOT EXISTS "organizations" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "logo_id" integer,
      "description" varchar,
      "active" boolean DEFAULT true,
      "type" "public"."enum_organizations_type" DEFAULT 'vertical' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" USING btree ("slug");

    DO $$ BEGIN
      ALTER TABLE "organizations"
        ADD CONSTRAINT "organizations_logo_id_media_id_fk"
        FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "users_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "organizations_id" integer
    );

    DO $$ BEGIN
      ALTER TABLE "users_rels"
        ADD CONSTRAINT "users_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "users_rels"
        ADD CONSTRAINT "users_rels_organizations_fk"
        FOREIGN KEY ("organizations_id") REFERENCES "public"."organizations"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- CRM Companies
    CREATE TYPE "public"."enum_crm_companies_status" AS ENUM('prospect', 'active', 'inactive', 'churn');

    CREATE TABLE IF NOT EXISTS "crm_companies" (
      "id" serial PRIMARY KEY NOT NULL,
      "legal_name" varchar NOT NULL,
      "trade_name" varchar NOT NULL,
      "cnpj" varchar,
      "segment" varchar,
      "city" varchar,
      "state" varchar,
      "country" varchar DEFAULT 'Brasil',
      "website" varchar,
      "owner_id" integer,
      "phone" varchar,
      "status" "public"."enum_crm_companies_status" DEFAULT 'prospect' NOT NULL,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "crm_companies_cnpj_idx" ON "crm_companies" USING btree ("cnpj");

    DO $$ BEGIN
      ALTER TABLE "crm_companies"
        ADD CONSTRAINT "crm_companies_owner_id_users_id_fk"
        FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

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

    -- Contacts
    CREATE TABLE IF NOT EXISTS "contacts" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "job_title" varchar,
      "email" varchar,
      "phone" varchar,
      "whatsapp" varchar,
      "company_id" integer,
      "origin" varchar,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "contacts"
        ADD CONSTRAINT "contacts_company_id_crm_companies_id_fk"
        FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- Leads
    CREATE TYPE "public"."enum_leads_status" AS ENUM(
      'novo', 'contato', 'qualificado', 'diagnostico', 'proposta', 'negociacao', 'fechado', 'perdido'
    );
    CREATE TYPE "public"."enum_leads_temperature" AS ENUM('frio', 'morno', 'quente');

    CREATE TABLE IF NOT EXISTS "leads" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "company_name" varchar,
      "company_id" integer,
      "contact_id" integer,
      "origin" varchar,
      "interest" varchar,
      "group_organization_id" integer,
      "status" "public"."enum_leads_status" DEFAULT 'novo' NOT NULL,
      "temperature" "public"."enum_leads_temperature" DEFAULT 'frio' NOT NULL,
      "owner_id" integer,
      "estimated_value" numeric,
      "probability" numeric,
      "notes" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "leads"
        ADD CONSTRAINT "leads_company_id_crm_companies_id_fk"
        FOREIGN KEY ("company_id") REFERENCES "public"."crm_companies"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "leads"
        ADD CONSTRAINT "leads_contact_id_contacts_id_fk"
        FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "leads"
        ADD CONSTRAINT "leads_group_organization_id_organizations_id_fk"
        FOREIGN KEY ("group_organization_id") REFERENCES "public"."organizations"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "leads"
        ADD CONSTRAINT "leads_owner_id_users_id_fk"
        FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- Activities
    CREATE TYPE "public"."enum_activities_type" AS ENUM('create', 'update', 'status_change', 'comment');

    CREATE TABLE IF NOT EXISTS "activities" (
      "id" serial PRIMARY KEY NOT NULL,
      "type" "public"."enum_activities_type" DEFAULT 'comment' NOT NULL,
      "message" varchar NOT NULL,
      "author_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "activities"
        ADD CONSTRAINT "activities_author_id_users_id_fk"
        FOREIGN KEY ("author_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "activities_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "leads_id" integer,
      "contacts_id" integer,
      "crm_companies_id" integer
    );

    DO $$ BEGIN
      ALTER TABLE "activities_rels"
        ADD CONSTRAINT "activities_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."activities"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- Portal companies: application URL for product apps (Neurofrigo Carga)
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "application_url" varchar;

    -- Locked documents / preferences may need enum updates for new collections — skipped (Payload self-heals on push in some setups)
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "companies" DROP COLUMN IF EXISTS "application_url";

    DROP TABLE IF EXISTS "activities_rels" CASCADE;
    DROP TABLE IF EXISTS "activities" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_activities_type";

    DROP TABLE IF EXISTS "leads" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_leads_status";
    DROP TYPE IF EXISTS "public"."enum_leads_temperature";

    DROP TABLE IF EXISTS "contacts" CASCADE;

    DROP TABLE IF EXISTS "crm_companies_tags" CASCADE;
    DROP TABLE IF EXISTS "crm_companies" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_crm_companies_status";

    DROP TABLE IF EXISTS "users_rels" CASCADE;
    DROP TABLE IF EXISTS "users_interest_areas" CASCADE;
    DROP TABLE IF EXISTS "organizations" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_organizations_type";

    ALTER TABLE "users" DROP COLUMN IF EXISTS "first_name";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "last_name";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "phone";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "whatsapp";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "cpf";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "photo_id";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "employer_name";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "job_title";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "segment";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "country";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "state";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "city";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "account_status";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "lgpd_accepted";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "lgpd_accepted_at";
    DROP TYPE IF EXISTS "public"."enum_users_account_status";

    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE text USING "role"::text;
    DROP TYPE IF EXISTS "public"."enum_users_role";
    CREATE TYPE "public"."enum_users_role" AS ENUM(
      'super_admin', 'admin', 'editor', 'partner', 'instructor', 'student'
    );
    ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "public"."enum_users_role"
      USING (
        CASE
          WHEN "role" = 'super_admin' THEN 'super_admin'::"public"."enum_users_role"
          WHEN "role" = 'admin' THEN 'admin'::"public"."enum_users_role"
          WHEN "role" = 'editor' THEN 'editor'::"public"."enum_users_role"
          WHEN "role" = 'partner' THEN 'partner'::"public"."enum_users_role"
          WHEN "role" = 'instructor' THEN 'instructor'::"public"."enum_users_role"
          WHEN "role" = 'student' THEN 'student'::"public"."enum_users_role"
          ELSE 'editor'::"public"."enum_users_role"
        END
      );
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."enum_users_role";
  `);
}
