import type {
  HealthStatus,
  ProviderMetadata,
  VectorRecord,
  VectorSearchFilters,
  VectorSearchHit,
} from '../domain/types';

export interface EmbeddingProviderPort {
  generate(text: string): Promise<number[]>;
  generateBatch(texts: string[]): Promise<number[][]>;
  health(): Promise<HealthStatus>;
  metadata(): ProviderMetadata;
}

export interface VectorStorePort {
  insert(record: VectorRecord): Promise<void>;
  update(record: VectorRecord): Promise<void>;
  delete(id: string): Promise<void>;
  search(
    embedding: number[],
    filters: VectorSearchFilters,
    limit: number,
  ): Promise<VectorSearchHit[]>;
  deleteDocument(documentId: string): Promise<number>;
  deleteResource(resourceId: string): Promise<number>;
  health(): Promise<HealthStatus>;
}

export type AclSubject = {
  role?: string | null;
  userId?: string | null;
  tenantId?: string | null;
  companyIds?: Array<string | number>;
  channel?: 'portal_chat' | 'admin' | 'system' | 'command';
};

export interface AclFilterPort {
  filter(hits: VectorSearchHit[], subject: AclSubject): Promise<VectorSearchHit[]>;
}

export interface RankerPort {
  rank(
    hits: VectorSearchHit[],
    context: {
      courseId?: string | null;
      lessonId?: string | null;
      moduleId?: string | null;
    },
  ): import('../domain/types').RankedHit[];
}

export interface CitationBuilderPort {
  build(hits: import('../domain/types').RankedHit[]): import('../domain/types').CitationResult[];
}

/** Executor SQL genérico — adapters de banco não acoplam ao driver. */
export type SqlQueryResult = {
  rows: Record<string, unknown>[];
};

export interface SqlExecutor {
  query(sql: string, params?: unknown[]): Promise<SqlQueryResult>;
}
