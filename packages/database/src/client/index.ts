import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Cliente Drizzle ORM — conexão base com PostgreSQL.
 * Tabelas de negócio serão adicionadas na Sprint 2+.
 */
export function createDatabaseClient(connectionString?: string) {
  const url =
    connectionString ??
    process.env.DATABASE_URL ??
    'postgresql://omnia:omnia_dev_password@localhost:5432/omnia_platform';

  const client = postgres(url, { max: 10 });
  const db = drizzle(client);

  return { db, client };
}

/** Instância singleton para uso em desenvolvimento */
let instance: ReturnType<typeof createDatabaseClient> | null = null;

export function getDatabase() {
  if (!instance) {
    instance = createDatabaseClient();
  }
  return instance.db;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  const { client } = createDatabaseClient();
  try {
    await client`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await client.end();
  }
}
