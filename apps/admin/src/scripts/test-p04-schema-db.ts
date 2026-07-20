/* eslint-disable no-console -- schema probe */
/**
 * Valida schema HOTFIX P04: crm_companies_texts + locked_documents CRM rels.
 * Requer DATABASE_URL. Não imprime a connection string.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log('SKIP test:p04-schema-db — DATABASE_URL não definido');
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

const columnExists = async (table: string, column: string): Promise<boolean> => {
  const result = await client.query(`
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${table}'
      AND column_name = '${column}'
    LIMIT 1
  `);
  return result.rows.length > 0;
};

const tableExists = async (table: string): Promise<boolean> => {
  const result = await client.query(`
    SELECT 1 AS ok
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '${table}'
    LIMIT 1
  `);
  return result.rows.length > 0;
};

const main = async (): Promise<void> => {
  await client.connect();

  assert.equal(await tableExists('crm_companies_texts'), true, 'crm_companies_texts deve existir');
  assert.equal(await tableExists('crm_companies_tags'), false, 'crm_companies_tags deve ter sido removida');

  for (const col of ['id', 'order', 'parent_id', 'path', 'text']) {
    assert.equal(await columnExists('crm_companies_texts', col), true, `coluna ${col}`);
  }

  for (const col of [
    'organizations_id',
    'crm_companies_id',
    'contacts_id',
    'leads_id',
    'activities_id',
  ]) {
    assert.equal(
      await columnExists('payload_locked_documents_rels', col),
      true,
      `locked rels ${col}`,
    );
  }

  const migrations = await client.query(`
    SELECT name FROM payload_migrations
    WHERE name IN (
      '20260720_190000_crm_companies_texts',
      '20260720_191000_locked_documents_crm_rels'
    )
  `);
  assert.equal(migrations.rows.length, 2, 'migrations P04 registradas');

  console.log('✓ schema P04 OK (crm_companies_texts + locked_documents CRM rels)');
  await client.end();
};

main().catch(async (error) => {
  console.error(error);
  try {
    await client.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
