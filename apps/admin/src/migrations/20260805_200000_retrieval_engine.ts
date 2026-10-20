import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Epic 04 — Retrieval Engine.
 * Collections: embedding-records, search-sessions.
 * Global: retrieval-dashboard.
 * Vector table: retrieval_vectors (pgvector when available).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_embedding_records_status" AS ENUM(
        'pending','processing','ready','failed','stale'
      );
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "embedding_records" (
      "id" serial PRIMARY KEY NOT NULL,
      "chunk_id" integer NOT NULL,
      "knowledge_document_id" integer,
      "learning_resource_id" integer,
      "provider" varchar NOT NULL,
      "model" varchar NOT NULL,
      "dimensions" numeric NOT NULL,
      "checksum" varchar NOT NULL,
      "status" "public"."enum_embedding_records_status" DEFAULT 'pending' NOT NULL,
      "version" varchar DEFAULT '1' NOT NULL,
      "vector_id" varchar,
      "last_error" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "embedding_records_chunk_idx" ON "embedding_records" USING btree ("chunk_id");
    CREATE INDEX IF NOT EXISTS "embedding_records_knowledge_document_idx" ON "embedding_records" USING btree ("knowledge_document_id");
    CREATE INDEX IF NOT EXISTS "embedding_records_learning_resource_idx" ON "embedding_records" USING btree ("learning_resource_id");
    CREATE INDEX IF NOT EXISTS "embedding_records_provider_idx" ON "embedding_records" USING btree ("provider");
    CREATE INDEX IF NOT EXISTS "embedding_records_checksum_idx" ON "embedding_records" USING btree ("checksum");
    CREATE INDEX IF NOT EXISTS "embedding_records_status_idx" ON "embedding_records" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "embedding_records_vector_id_idx" ON "embedding_records" USING btree ("vector_id");
    CREATE INDEX IF NOT EXISTS "embedding_records_updated_at_idx" ON "embedding_records" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "embedding_records_created_at_idx" ON "embedding_records" USING btree ("created_at");

    DO $$ BEGIN
      ALTER TABLE "embedding_records" ADD CONSTRAINT "embedding_records_chunk_id_knowledge_chunks_id_fk"
        FOREIGN KEY ("chunk_id") REFERENCES "public"."knowledge_chunks"("id") ON DELETE restrict ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "embedding_records" ADD CONSTRAINT "embedding_records_knowledge_document_id_knowledge_documents_id_fk"
        FOREIGN KEY ("knowledge_document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "embedding_records" ADD CONSTRAINT "embedding_records_learning_resource_id_learning_resources_id_fk"
        FOREIGN KEY ("learning_resource_id") REFERENCES "public"."learning_resources"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "search_sessions" (
      "id" serial PRIMARY KEY NOT NULL,
      "query" varchar NOT NULL,
      "took_ms" numeric NOT NULL,
      "provider" varchar NOT NULL,
      "model" varchar,
      "result_count" numeric DEFAULT 0 NOT NULL,
      "recovered_tokens" numeric DEFAULT 0 NOT NULL,
      "filters" jsonb,
      "tenant_id" integer,
      "user_id" integer,
      "owner_company_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "search_sessions_tenant_idx" ON "search_sessions" USING btree ("tenant_id");
    CREATE INDEX IF NOT EXISTS "search_sessions_user_idx" ON "search_sessions" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "search_sessions_owner_company_idx" ON "search_sessions" USING btree ("owner_company_id");
    CREATE INDEX IF NOT EXISTS "search_sessions_updated_at_idx" ON "search_sessions" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "search_sessions_created_at_idx" ON "search_sessions" USING btree ("created_at");

    CREATE TABLE IF NOT EXISTS "search_sessions_chunk_ids" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "chunk_id" varchar NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "search_sessions_chunk_ids" ADD CONSTRAINT "search_sessions_chunk_ids_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."search_sessions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "search_sessions_chunk_ids_order_idx" ON "search_sessions_chunk_ids" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "search_sessions_chunk_ids_parent_id_idx" ON "search_sessions_chunk_ids" USING btree ("_parent_id");

    CREATE TABLE IF NOT EXISTS "search_sessions_scores" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "score" numeric NOT NULL
    );
    DO $$ BEGIN
      ALTER TABLE "search_sessions_scores" ADD CONSTRAINT "search_sessions_scores_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."search_sessions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "search_sessions_scores_order_idx" ON "search_sessions_scores" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "search_sessions_scores_parent_id_idx" ON "search_sessions_scores" USING btree ("_parent_id");

    DO $$ BEGIN
      ALTER TABLE "search_sessions" ADD CONSTRAINT "search_sessions_tenant_id_tenants_id_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "search_sessions" ADD CONSTRAINT "search_sessions_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "search_sessions" ADD CONSTRAINT "search_sessions_owner_company_id_companies_id_fk"
        FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "retrieval_dashboard" (
      "id" serial PRIMARY KEY NOT NULL,
      "embeddings_ready" numeric DEFAULT 0,
      "embeddings_failed" numeric DEFAULT 0,
      "queue_pending" numeric DEFAULT 0,
      "queue_processing" numeric DEFAULT 0,
      "queue_failed" numeric DEFAULT 0,
      "vector_count" numeric DEFAULT 0,
      "avg_search_ms" numeric DEFAULT 0,
      "search_sessions_count" numeric DEFAULT 0,
      "reindex_count" numeric DEFAULT 0,
      "top_documents" jsonb,
      "top_queries" jsonb,
      "last_refresh_at" timestamp(3) with time zone,
      "last_activity_summary" varchar DEFAULT 'Sem atividade',
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    -- Vector index table (pgvector preferred; float array fallback created by adapter ensureSchema)
    DO $$ BEGIN
      CREATE EXTENSION IF NOT EXISTS vector;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pgvector extension unavailable — adapter will use float_array mode';
    END $$;

    DO $$ BEGIN
      CREATE TABLE IF NOT EXISTS "retrieval_vectors" (
        "id" text PRIMARY KEY,
        "chunk_id" text NOT NULL,
        "embedding" vector(384) NOT NULL,
        "text" text NOT NULL,
        "token_estimate" integer NOT NULL DEFAULT 0,
        "knowledge_document_id" text,
        "learning_resource_id" text,
        "course_id" text,
        "module_id" text,
        "lesson_id" text,
        "owner_company_id" text,
        "tenant_id" text,
        "language" text,
        "version" text,
        "tags" text[] DEFAULT '{}',
        "category" text,
        "page" integer,
        "priority" integer DEFAULT 0,
        "allow_ai_use" boolean DEFAULT true,
        "publication_status" text,
        "visibility" text,
        "status" text,
        "created_at" timestamptz DEFAULT now(),
        "updated_at" timestamptz DEFAULT now()
      );
    EXCEPTION WHEN undefined_object THEN
      CREATE TABLE IF NOT EXISTS "retrieval_vectors" (
        "id" text PRIMARY KEY,
        "chunk_id" text NOT NULL,
        "embedding" double precision[] NOT NULL,
        "text" text NOT NULL,
        "token_estimate" integer NOT NULL DEFAULT 0,
        "knowledge_document_id" text,
        "learning_resource_id" text,
        "course_id" text,
        "module_id" text,
        "lesson_id" text,
        "owner_company_id" text,
        "tenant_id" text,
        "language" text,
        "version" text,
        "tags" text[] DEFAULT '{}',
        "category" text,
        "page" integer,
        "priority" integer DEFAULT 0,
        "allow_ai_use" boolean DEFAULT true,
        "publication_status" text,
        "visibility" text,
        "status" text,
        "created_at" timestamptz DEFAULT now(),
        "updated_at" timestamptz DEFAULT now()
      );
    END $$;

    CREATE INDEX IF NOT EXISTS "retrieval_vectors_chunk_idx" ON "retrieval_vectors" ("chunk_id");
    CREATE INDEX IF NOT EXISTS "retrieval_vectors_doc_idx" ON "retrieval_vectors" ("knowledge_document_id");
    CREATE INDEX IF NOT EXISTS "retrieval_vectors_resource_idx" ON "retrieval_vectors" ("learning_resource_id");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "embedding_records_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "search_sessions_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_embedding_records_fk"
        FOREIGN KEY ("embedding_records_id") REFERENCES "public"."embedding_records"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_search_sessions_fk"
        FOREIGN KEY ("search_sessions_id") REFERENCES "public"."search_sessions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_embedding_records_id_idx"
      ON "payload_locked_documents_rels" USING btree ("embedding_records_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_search_sessions_id_idx"
      ON "payload_locked_documents_rels" USING btree ("search_sessions_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "retrieval_vectors" CASCADE;
    DROP TABLE IF EXISTS "retrieval_dashboard" CASCADE;
    DROP TABLE IF EXISTS "search_sessions_scores" CASCADE;
    DROP TABLE IF EXISTS "search_sessions_chunk_ids" CASCADE;
    DROP TABLE IF EXISTS "search_sessions" CASCADE;
    DROP TABLE IF EXISTS "embedding_records" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_embedding_records_status";
  `);
}
