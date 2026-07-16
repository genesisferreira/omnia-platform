/* eslint-disable no-console -- migration DB probe */
/**
 * Valida schema Pages + blocos institucionais no PostgreSQL (S04-F6).
 * Requer DATABASE_URL. Não imprime a connection string.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { down as rollbackInstitutionalMigration } from '../migrations/20260716_172340_pages_institutional';

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

// eslint-disable-next-line @typescript-eslint/no-require-imports -- resolve transitive drizzle
const { drizzle } = require(
  require.resolve('drizzle-orm/node-postgres', {
    paths: [require.resolve('@payloadcms/db-postgres')],
  }),
) as {
  drizzle: (client: unknown) => { execute: (query: unknown) => Promise<unknown> };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '../..');

const INSTITUTIONAL_MIGRATION_NAME = '20260716_172340_pages_institutional';

const runAdmin = (args: string[]): void => {
  const command = process.platform === 'win32' ? 'corepack' : 'pnpm';
  const commandArgs = process.platform === 'win32' ? ['pnpm', ...args] : args;
  const result = spawnSync(command, commandArgs, {
    cwd: adminRoot,
    env: process.env,
    stdio: 'pipe',
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `command failed: pnpm ${args.join(' ')}\n${result.stderr ?? result.stdout ?? ''}`,
    );
  }
};

const rollbackInstitutionalOnly = async (): Promise<void> => {
  const latest = await client.query(`
    SELECT name FROM payload_migrations
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `);
  assert.equal(String(latest.rows[0]?.name), INSTITUTIONAL_MIGRATION_NAME);

  const migrationDb = drizzle(client);
  await rollbackInstitutionalMigration({
    db: migrationDb as never,
    payload: {} as never,
    req: {} as never,
  });

  await client.query(
    `DELETE FROM payload_migrations WHERE name = '${INSTITUTIONAL_MIGRATION_NAME}'`,
  );
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
  console.log('==> Aplicando migrations (fresh)...');
  runAdmin(['migrate']);

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

  await test('tabelas de blocks, versions e institucionais existem', async () => {
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
      'pages_blocks_institutional_intro',
      'pages_blocks_institutional_intro_highlights',
      'pages_blocks_mission_vision',
      'pages_blocks_values',
      'pages_blocks_values_items',
      '_pages_v',
      '_pages_v_blocks_hero',
      '_pages_v_blocks_features',
      '_pages_v_blocks_companies',
      '_pages_v_blocks_institutional_intro',
      '_pages_v_blocks_mission_vision',
      '_pages_v_blocks_values',
    ]) {
      assert.equal(names.has(t), true, `missing table ${t}`);
    }
  });

  await test('índices unique site+slug e one home preservados', async () => {
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

  await test('ciclo rollback institucional → migrate reaplica última migration', async () => {
    const before = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'pages_blocks_values'
    `);
    assert.equal(before.rows.length, 1);

    await rollbackInstitutionalOnly();

    const afterDown = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'pages_blocks_values'
    `);
    assert.equal(afterDown.rows.length, 0);

    const remaining = await client.query(`
      SELECT name FROM payload_migrations ORDER BY created_at DESC, id DESC LIMIT 1
    `);
    assert.equal(String(remaining.rows[0]?.name), '20260716_124305_pages');

    runAdmin(['migrate']);

    const afterUp = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'pages_blocks_values'
    `);
    assert.equal(afterUp.rows.length, 1);

    const restored = await client.query(
      `SELECT name FROM payload_migrations WHERE name = '${INSTITUTIONAL_MIGRATION_NAME}'`,
    );
    assert.equal(restored.rows.length, 1);
  });

  console.log(`\n${passed} testes DB de migration passaram.`);
} finally {
  await client.end();
}
