import {
  createEmbeddingProvider,
  PgVectorStore,
  type EmbeddingProviderPort,
  type SqlExecutor,
  type VectorStorePort,
} from '@omnia/retrieval';
import postgres from 'postgres';

let sqlClient: ReturnType<typeof postgres> | null = null;
let vectorStore: VectorStorePort | null = null;
let embeddingProvider: EmbeddingProviderPort | null = null;
let schemaReady = false;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required for retrieval vector store');
  return url;
}

export function createSqlExecutorFromUrl(databaseUrl = getDatabaseUrl()): SqlExecutor {
  if (!sqlClient) {
    sqlClient = postgres(databaseUrl, { max: 4 });
  }
  const client = sqlClient;
  return {
    async query(sqlText: string, params: unknown[] = []) {
      const rows = (await client.unsafe(sqlText, params as never[])) as unknown as Record<
        string,
        unknown
      >[];
      return { rows: [...rows] };
    },
  };
}

export function getEmbeddingProvider(): EmbeddingProviderPort {
  if (!embeddingProvider) {
    embeddingProvider = createEmbeddingProvider(
      process.env as unknown as import('@omnia/retrieval').EmbeddingProviderFactoryEnv,
    );
  }
  return embeddingProvider;
}

export async function getVectorStore(): Promise<VectorStorePort> {
  if (vectorStore && schemaReady) return vectorStore;

  const dimensions = Number(
    process.env.RETRIEVAL_EMBEDDING_DIMENSIONS || getEmbeddingProvider().metadata().dimensions,
  );
  const modeEnv = (process.env.RETRIEVAL_VECTOR_MODE || 'auto').toLowerCase();
  const sql = createSqlExecutorFromUrl();

  let mode: 'pgvector' | 'float_array' = 'float_array';
  if (modeEnv === 'pgvector') mode = 'pgvector';
  else if (modeEnv === 'float_array') mode = 'float_array';
  else {
    try {
      await sql.query('CREATE EXTENSION IF NOT EXISTS vector');
      mode = 'pgvector';
    } catch {
      mode = 'float_array';
    }
  }

  const store = new PgVectorStore(sql, { dimensions, mode });
  await store.ensureSchema();
  schemaReady = true;
  vectorStore = store;
  return store;
}

export function getRetrievalProviderName(): string {
  return getEmbeddingProvider().metadata().name;
}

export function getMaxEmbeddingAttempts(): number {
  return Math.max(1, Number(process.env.RETRIEVAL_EMBEDDING_MAX_ATTEMPTS || 3));
}
