/* eslint-disable no-console -- migration DB probe */
/**
 * Valida schema Pages no PostgreSQL temporário (F4C.2).
 * Requer DATABASE_URL. Não imprime a connection string.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log('SKIP test:pages-migration-db — DATABASE_URL não definido');
  process.exit(0);
}

const require = createRequire(import.meta.url);
const pgModulePath = require.resolve('pg', {
  paths: [require.resolve('@payloadcms/db-postgres')],
});

// eslint-disable-next-line @typescript-eslint/no-require-imports -- resolve transitive pg
const { Client } = require(pgModulePath) as {
  Client: new (config: { connectionString: string }) => {
    connect: () => Promise<void>;
    end: () => Promise<void>;
    query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
  };
};

const client = new Client({ connectionString: databaseUrl });
await client.connect();

let passed = 0;
const test = async (name: string, fn: () => Promise<void>): Promise<void> => {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

try {
  await test('tabela pages existe com colunas essenciais', async () => {
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'pages'
    `);
    const names = new Set(cols.rows.map((r) => String(r.column_name)));
    for (const col of [
      'id',
      'site_id',
      'title',
      'slug',
      'page_type',
      '_status',
      'seo_meta_title',
      'seo_meta_description',
      'seo_canonical_url',
      'seo_no_index',
      'created_at',
      'updated_at',
    ]) {
      assert.equal(names.has(col), true, `missing column ${col}`);
    }
  });

  await test('tabelas de blocks e versions existem', async () => {
    const tables = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename LIKE '%page%'
    `);
    const names = new Set(tables.rows.map((r) => String(r.tablename)));
    for (const t of [
      'pages',
      'pages_blocks_hero',
      'pages_blocks_features',
      'pages_blocks_features_items',
      'pages_blocks_companies',
      '_pages_v',
      '_pages_v_blocks_hero',
      '_pages_v_blocks_features',
      '_pages_v_blocks_companies',
    ]) {
      assert.equal(names.has(t), true, `missing table ${t}`);
    }
  });

  await test('índices unique site+slug e one home', async () => {
    const indexes = await client.query(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'pages'
    `);
    const byName = new Map(
      indexes.rows.map((r) => [String(r.indexname), String(r.indexdef)] as const),
    );
    assert.ok(byName.has('pages_site_slug_unique'));
    assert.ok(byName.has('pages_one_home_per_site'));
    assert.equal(
      String(byName.get('pages_one_home_per_site')).includes("page_type = 'home'"),
      true,
    );
  });

  await test('FK pages.site_id → sites', async () => {
    const fks = await client.query(`
      SELECT conname FROM pg_constraint
      WHERE conname = 'pages_site_id_sites_id_fk'
    `);
    assert.equal(fks.rows.length, 1);
  });

  console.log(`\n${passed} testes DB de migration passaram.`);
} finally {
  await client.end();
}
