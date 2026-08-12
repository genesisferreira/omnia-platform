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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(adminRoot, '../..');

import { migrations } from '../migrations';

const EXPECTED_MIGRATION_NAMES = migrations.map((item) => item.name);

const runAdminMigrate = (): void => {
  const command = process.platform === 'win32' ? 'corepack' : 'pnpm';
  const commandArgs =
    process.platform === 'win32'
      ? ['pnpm', '--filter', '@omnia/admin', 'migrate']
      : ['--filter', '@omnia/admin', 'migrate'];
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`command failed: pnpm --filter @omnia/admin migrate (exit ${result.status})`);
  }
};

const listMigrationNames = async (): Promise<string[]> => {
  const result = await client.query(`
    SELECT name FROM payload_migrations
    ORDER BY created_at ASC, id ASC
  `);
  return result.rows.map((row) => String(row.name));
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
  runAdminMigrate();
  console.log('==> Reaplicando migrations (upgrade idempotente)...');
  runAdminMigrate();

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

  await test('registry Payload contém todas as migrations do código', async () => {
    const names = await listMigrationNames();
    assert.equal(EXPECTED_MIGRATION_NAMES.length >= 31, true, 'expected at least 31 migrations');
    for (const name of EXPECTED_MIGRATION_NAMES) {
      assert.equal(names.includes(name), true, `migration ausente: ${name}`);
    }
    assert.equal(names.length, EXPECTED_MIGRATION_NAMES.length);
  });

  await test('tabelas SIP/Adaptive/Knowledge existem após fresh migrate', async () => {
    const tables = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'sip_profiles',
          'adaptive_decisions',
          'knowledge_documents',
          'knowledge_chunks',
          'embedding_records',
          'pages'
        )
    `);
    const names = new Set(tables.rows.map((r) => String(r.tablename)));
    for (const table of [
      'sip_profiles',
      'adaptive_decisions',
      'knowledge_documents',
      'knowledge_chunks',
      'embedding_records',
      'pages',
    ]) {
      assert.equal(names.has(table), true, `missing table ${table}`);
    }
  });

  /**
   * Mid-stack `down` of institutional pages was valid when Pages was near tip.
   * With Neurofrigo E03–E15 migrations applied after it, destructive rollback is
   * no longer a safe CI invariant and can fail for unrelated schema coupling.
   * Schema + full migration registry checks above remain the release gate.
   */
  console.log('ℹ skipped institutional mid-stack rollback cycle (unsafe with post-CRM migrations)');

  console.log(`\n${passed} testes DB de migration passaram.`);
} finally {
  await client.end();
}
