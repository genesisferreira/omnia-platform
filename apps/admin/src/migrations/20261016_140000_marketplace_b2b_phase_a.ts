import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';
import { sql } from '@payloadcms/db-postgres';

/**
 * Marketplace B2B Fase A — somente ADITIVA e idempotente (IF NOT EXISTS).
 * Cria as tabelas de associações de parceiros, catálogos (produtos/serviços) e cotações
 * (solicitações, propostas, versões, eventos) e as colunas de lock-rels do Payload.
 * Enums são varchar (validados no Payload). Não altera parceiros, usuários nem collections LMS.
 */

type Fk = [table: string, column: string, ref: string, onDelete: string];

const FKS: Fk[] = [
  ['partner_memberships', 'user_id', 'users', 'cascade'],
  ['partner_memberships', 'partner_id', 'partners', 'cascade'],
  ['partner_memberships', 'invited_by_id', 'users', 'set null'],

  ['partner_product_listings', 'partner_id', 'partners', 'cascade'],
  ['partner_product_listings', 'created_by_id', 'users', 'set null'],
  ['partner_product_listings', 'updated_by_id', 'users', 'set null'],
  ['partner_service_listings', 'partner_id', 'partners', 'cascade'],
  ['partner_service_listings', 'created_by_id', 'users', 'set null'],
  ['partner_service_listings', 'updated_by_id', 'users', 'set null'],

  ['quote_requests', 'buyer_user_id', 'users', 'restrict'],
  ['quote_requests', 'partner_id', 'partners', 'restrict'],
  ['quote_requests', 'product_listing_id', 'partner_product_listings', 'set null'],
  ['quote_requests', 'service_listing_id', 'partner_service_listings', 'set null'],

  ['quote_proposals', 'quote_request_id', 'quote_requests', 'cascade'],
  ['quote_proposals', 'partner_id', 'partners', 'restrict'],
  ['quote_proposals', 'buyer_user_id', 'users', 'restrict'],

  ['quote_proposal_versions', 'proposal_id', 'quote_proposals', 'cascade'],
  ['quote_proposal_versions', 'quote_request_id', 'quote_requests', 'cascade'],
  ['quote_proposal_versions', 'partner_id', 'partners', 'restrict'],
  ['quote_proposal_versions', 'buyer_user_id', 'users', 'restrict'],
  ['quote_proposal_versions', 'sent_by_id', 'users', 'set null'],

  ['quote_events', 'quote_request_id', 'quote_requests', 'cascade'],
  ['quote_events', 'partner_id', 'partners', 'restrict'],
  ['quote_events', 'buyer_user_id', 'users', 'restrict'],
  ['quote_events', 'proposal_id', 'quote_proposals', 'set null'],
  ['quote_events', 'actor_id', 'users', 'set null'],

  ['partner_product_listings_images', 'image_id', 'media', 'set null'],
  ['partner_service_listings_images', 'image_id', 'media', 'set null'],
];

const ARRAY_PARENT_FKS: Array<[table: string, parent: string]> = [
  ['partner_product_listings_images', 'partner_product_listings'],
  ['partner_service_listings_images', 'partner_service_listings'],
  ['quote_proposal_versions_items', 'quote_proposal_versions'],
];

const TABLES = [
  'partner_memberships',
  'partner_product_listings',
  'partner_product_listings_images',
  'partner_service_listings',
  'partner_service_listings_images',
  'quote_requests',
  'quote_proposals',
  'quote_proposal_versions',
  'quote_proposal_versions_items',
  'quote_events',
] as const;

const LOCKED_COLLECTIONS = [
  'partner_memberships',
  'partner_product_listings',
  'partner_service_listings',
  'quote_requests',
  'quote_proposals',
  'quote_proposal_versions',
  'quote_events',
] as const;

const INDEXES: Array<[name: string, table: string, columns: string, unique?: boolean]> = [
  ['partner_memberships_user_idx', 'partner_memberships', '"user_id"'],
  ['partner_memberships_partner_idx', 'partner_memberships', '"partner_id"'],
  ['partner_memberships_status_idx', 'partner_memberships', '"status"'],
  ['partner_memberships_invited_by_idx', 'partner_memberships', '"invited_by_id"'],
  ['partner_memberships_updated_at_idx', 'partner_memberships', '"updated_at"'],
  ['partner_memberships_created_at_idx', 'partner_memberships', '"created_at"'],
  ['partner_memberships_user_partner_idx', 'partner_memberships', '"user_id", "partner_id"', true],
];

for (const kind of ['product', 'service'] as const) {
  const t = `partner_${kind}_listings`;
  INDEXES.push(
    [`${t}_slug_idx`, t, '"slug"'],
    [`${t}_partner_idx`, t, '"partner_id"'],
    [`${t}_category_idx`, t, '"category"'],
    [`${t}_status_idx`, t, '"status"'],
    [`${t}_created_by_idx`, t, '"created_by_id"'],
    [`${t}_updated_by_idx`, t, '"updated_by_id"'],
    [`${t}_updated_at_idx`, t, '"updated_at"'],
    [`${t}_created_at_idx`, t, '"created_at"'],
    [`${t}_partner_slug_idx`, t, '"partner_id", "slug"', true],
    [`${t}_images_order_idx`, `${t}_images`, '"_order"'],
    [`${t}_images_parent_id_idx`, `${t}_images`, '"_parent_id"'],
    [`${t}_images_image_idx`, `${t}_images`, '"image_id"'],
  );
}
INDEXES.push(
  ['partner_product_listings_brand_idx', 'partner_product_listings', '"brand"'],
  ['partner_product_listings_sku_idx', 'partner_product_listings', '"sku"'],

  ['quote_requests_public_id_idx', 'quote_requests', '"public_id"', true],
  ['quote_requests_buyer_user_idx', 'quote_requests', '"buyer_user_id"'],
  ['quote_requests_partner_idx', 'quote_requests', '"partner_id"'],
  ['quote_requests_product_listing_idx', 'quote_requests', '"product_listing_id"'],
  ['quote_requests_service_listing_idx', 'quote_requests', '"service_listing_id"'],
  ['quote_requests_city_idx', 'quote_requests', '"city"'],
  ['quote_requests_state_idx', 'quote_requests', '"state"'],
  ['quote_requests_status_idx', 'quote_requests', '"status"'],
  ['quote_requests_updated_at_idx', 'quote_requests', '"updated_at"'],
  ['quote_requests_created_at_idx', 'quote_requests', '"created_at"'],

  ['quote_proposals_quote_request_idx', 'quote_proposals', '"quote_request_id"'],
  ['quote_proposals_partner_idx', 'quote_proposals', '"partner_id"'],
  ['quote_proposals_buyer_user_idx', 'quote_proposals', '"buyer_user_id"'],
  ['quote_proposals_status_idx', 'quote_proposals', '"status"'],
  ['quote_proposals_updated_at_idx', 'quote_proposals', '"updated_at"'],
  ['quote_proposals_created_at_idx', 'quote_proposals', '"created_at"'],

  ['quote_proposal_versions_proposal_idx', 'quote_proposal_versions', '"proposal_id"'],
  ['quote_proposal_versions_quote_request_idx', 'quote_proposal_versions', '"quote_request_id"'],
  ['quote_proposal_versions_partner_idx', 'quote_proposal_versions', '"partner_id"'],
  ['quote_proposal_versions_buyer_user_idx', 'quote_proposal_versions', '"buyer_user_id"'],
  ['quote_proposal_versions_sent_by_idx', 'quote_proposal_versions', '"sent_by_id"'],
  ['quote_proposal_versions_updated_at_idx', 'quote_proposal_versions', '"updated_at"'],
  ['quote_proposal_versions_created_at_idx', 'quote_proposal_versions', '"created_at"'],
  [
    'quote_proposal_versions_proposal_version_number_idx',
    'quote_proposal_versions',
    '"proposal_id", "version_number"',
    true,
  ],
  ['quote_proposal_versions_items_order_idx', 'quote_proposal_versions_items', '"_order"'],
  ['quote_proposal_versions_items_parent_id_idx', 'quote_proposal_versions_items', '"_parent_id"'],

  ['quote_events_quote_request_idx', 'quote_events', '"quote_request_id"'],
  ['quote_events_partner_idx', 'quote_events', '"partner_id"'],
  ['quote_events_buyer_user_idx', 'quote_events', '"buyer_user_id"'],
  ['quote_events_proposal_idx', 'quote_events', '"proposal_id"'],
  ['quote_events_type_idx', 'quote_events', '"type"'],
  ['quote_events_visibility_idx', 'quote_events', '"visibility"'],
  ['quote_events_actor_idx', 'quote_events', '"actor_id"'],
  ['quote_events_updated_at_idx', 'quote_events', '"updated_at"'],
  ['quote_events_created_at_idx', 'quote_events', '"created_at"'],
);

function listingTable(kind: 'product' | 'service'): string {
  const product = kind === 'product';
  return `
    CREATE TABLE IF NOT EXISTS "partner_${kind}_listings" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "partner_id" integer NOT NULL,
      "category" varchar,
      ${product ? '"brand" varchar,\n      "model" varchar,\n      "sku" varchar,' : ''}
      "description" varchar,
      "price_mode" varchar DEFAULT 'on_request' NOT NULL,
      "price" numeric,
      "currency" varchar DEFAULT 'BRL' NOT NULL,
      ${product ? '"seo_title" varchar,\n      "seo_description" varchar,' : ''}
      "status" varchar DEFAULT 'draft' NOT NULL,
      "moderation_notes" varchar,
      "published_at" timestamp(3) with time zone,
      "created_by_id" integer,
      "updated_by_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "partner_${kind}_listings_images" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "image_id" integer NOT NULL,
      "alt" varchar
    );
  `;
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS "partner_memberships" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "partner_id" integer NOT NULL,
      "role" varchar DEFAULT 'viewer' NOT NULL,
      "status" varchar DEFAULT 'invited' NOT NULL,
      "invited_by_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `),
  );

  await db.execute(sql.raw(listingTable('product')));
  await db.execute(sql.raw(listingTable('service')));

  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS "quote_requests" (
      "id" serial PRIMARY KEY NOT NULL,
      "public_id" varchar NOT NULL,
      "buyer_user_id" integer NOT NULL,
      "partner_id" integer NOT NULL,
      "source_type" varchar NOT NULL,
      "product_listing_id" integer,
      "service_listing_id" integer,
      "description" varchar NOT NULL,
      "quantity" numeric,
      "city" varchar,
      "state" varchar,
      "desired_date" timestamp(3) with time zone,
      "contact_name" varchar,
      "contact_email" varchar,
      "contact_phone" varchar,
      "status" varchar DEFAULT 'submitted' NOT NULL,
      "status_changed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "quote_proposals" (
      "id" serial PRIMARY KEY NOT NULL,
      "quote_request_id" integer NOT NULL,
      "partner_id" integer NOT NULL,
      "buyer_user_id" integer NOT NULL,
      "title" varchar NOT NULL,
      "summary" varchar,
      "status" varchar DEFAULT 'draft' NOT NULL,
      "current_version_number" numeric DEFAULT 0,
      "valid_until" timestamp(3) with time zone,
      "sent_at" timestamp(3) with time zone,
      "responded_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "quote_proposal_versions" (
      "id" serial PRIMARY KEY NOT NULL,
      "proposal_id" integer NOT NULL,
      "quote_request_id" integer NOT NULL,
      "partner_id" integer NOT NULL,
      "buyer_user_id" integer NOT NULL,
      "version_number" numeric NOT NULL,
      "subtotal_cents" numeric NOT NULL,
      "discount_cents" numeric DEFAULT 0,
      "shipping_cents" numeric DEFAULT 0,
      "total_cents" numeric NOT NULL,
      "currency" varchar DEFAULT 'BRL' NOT NULL,
      "valid_until" timestamp(3) with time zone,
      "delivery_days" numeric,
      "payment_terms" varchar,
      "notes" varchar,
      "sent_at" timestamp(3) with time zone NOT NULL,
      "sent_by_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "quote_proposal_versions_items" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "description" varchar NOT NULL,
      "quantity" numeric DEFAULT 1 NOT NULL,
      "unit_price_cents" numeric NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "quote_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "quote_request_id" integer NOT NULL,
      "partner_id" integer NOT NULL,
      "buyer_user_id" integer NOT NULL,
      "proposal_id" integer,
      "type" varchar NOT NULL,
      "visibility" varchar DEFAULT 'internal' NOT NULL,
      "actor_id" integer,
      "from_status" varchar,
      "to_status" varchar,
      "message" varchar,
      "metadata" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `),
  );

  const fks: Fk[] = [
    ...FKS,
    ...ARRAY_PARENT_FKS.map(([table, parent]): Fk => [table, '_parent_id', parent, 'cascade']),
  ];
  for (const [table, column, ref, onDelete] of fks) {
    const name = column === '_parent_id' ? `${table}_parent_id_fk` : `${table}_${column}_${ref}_id_fk`;
    await db.execute(
      sql.raw(`
        DO $$ BEGIN
          ALTER TABLE "${table}" ADD CONSTRAINT "${name}"
            FOREIGN KEY ("${column}") REFERENCES "public"."${ref}"("id") ON DELETE ${onDelete} ON UPDATE no action;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `),
    );
  }

  for (const [name, table, columns, unique] of INDEXES) {
    await db.execute(
      sql.raw(
        `CREATE ${unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS "${name}" ON "${table}" USING btree (${columns});`,
      ),
    );
  }

  for (const table of LOCKED_COLLECTIONS) {
    const col = `${table}_id`;
    await db.execute(
      sql.raw(`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "${col}" integer;`),
    );
    await db.execute(
      sql.raw(`
        DO $$ BEGIN
          ALTER TABLE "payload_locked_documents_rels"
            ADD CONSTRAINT "payload_locked_documents_rels_${table}_fk"
            FOREIGN KEY ("${col}") REFERENCES "public"."${table}"("id") ON DELETE cascade ON UPDATE no action;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `),
    );
    await db.execute(
      sql.raw(
        `CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_${table}_id_idx" ON "payload_locked_documents_rels" USING btree ("${col}");`,
      ),
    );
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const table of LOCKED_COLLECTIONS) {
    await db.execute(
      sql.raw(`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "${table}_id";`),
    );
  }
  for (const table of [...TABLES].reverse()) {
    await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}";`));
  }
}
