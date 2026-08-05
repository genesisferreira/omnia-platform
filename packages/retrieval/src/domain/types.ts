/** Domínio Retrieval — tipos públicos (sem dependências externas). */

export const EMBEDDING_STATUSES = [
  'pending',
  'processing',
  'ready',
  'failed',
  'stale',
] as const;
export type EmbeddingStatus = (typeof EMBEDDING_STATUSES)[number];

export const DEFAULT_EMBEDDING_DIMENSIONS = 384;
export const DEFAULT_EMBEDDING_MODEL = 'omnia-deterministic-v1';
export const DEFAULT_EMBEDDING_PROVIDER = 'deterministic';

export type EmbeddingRecord = {
  id: string;
  chunkId: string;
  provider: string;
  model: string;
  dimensions: number;
  checksum: string;
  status: EmbeddingStatus;
  version: string;
  vectorId: string | null;
  knowledgeDocumentId?: string | null;
  learningResourceId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VectorRecord = {
  id: string;
  chunkId: string;
  embedding: number[];
  text: string;
  tokenEstimate: number;
  knowledgeDocumentId?: string | null;
  learningResourceId?: string | null;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  ownerCompanyId?: string | null;
  tenantId?: string | null;
  language?: string | null;
  version?: string | null;
  tags?: string[];
  category?: string | null;
  page?: number | null;
  priority?: number;
  allowAiUse?: boolean;
  publicationStatus?: string | null;
  visibility?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type VectorSearchFilters = {
  tenantId?: string | null;
  ownerCompanyId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  moduleId?: string | null;
  language?: string | null;
  tags?: string[];
  allowAiUse?: boolean;
  publicationStatus?: string | null;
  visibility?: string | null;
  status?: string | null;
};

export type VectorSearchHit = {
  record: VectorRecord;
  similarity: number;
};

export type RetrievalQuery = {
  text: string;
  tenantId?: string | null;
  userId?: string | null;
  ownerCompanyId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  moduleId?: string | null;
  tags?: string[];
  language?: string | null;
  topK?: number;
  candidateMultiplier?: number;
};

export type RankedHit = {
  record: VectorRecord;
  similarity: number;
  rankScore: number;
  rankReasons: string[];
};

export type CitationRef = {
  knowledgeDocumentId: string | null;
  courseId: string | null;
  moduleId: string | null;
  lessonId: string | null;
  learningResourceId: string | null;
  chunkId: string;
  page: number | null;
  version: string | null;
};

export type CitationResult = {
  chunkId: string;
  text: string;
  score: number;
  similarity: number;
  tokenEstimate: number;
  citation: CitationRef;
  language: string | null;
  tags: string[];
};

export type RetrievalResult = {
  query: string;
  tookMs: number;
  provider: string;
  model: string;
  dimensions: number;
  filters: VectorSearchFilters;
  results: CitationResult[];
  recoveredTokens: number;
  candidateCount: number;
  afterAclCount: number;
};

export type SearchSessionInput = {
  query: string;
  tookMs: number;
  provider: string;
  model: string;
  filters: VectorSearchFilters;
  chunkIds: string[];
  scores: number[];
  recoveredTokens: number;
  resultCount: number;
  tenantId?: string | null;
  userId?: string | null;
  ownerCompanyId?: string | null;
};

export type ProviderMetadata = {
  name: string;
  model: string;
  dimensions: number;
  maxBatchSize: number;
};

export type HealthStatus = {
  ok: boolean;
  detail: string;
};
