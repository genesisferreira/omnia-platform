/** Future ports — no external calls in this macroentrega. */

export type PortMode = 'disabled' | 'mock' | 'not_implemented';

export type PortResult<T = unknown> = {
  ok: false;
  mode: PortMode;
  code: 'NOT_IMPLEMENTED' | 'CONTROLLED_MOCK' | 'DISABLED';
  message: string;
  data?: T;
};

function notImplemented(name: string): PortResult {
  return {
    ok: false,
    mode: 'not_implemented',
    code: 'NOT_IMPLEMENTED',
    message: `${name} not implemented in Knowledge Hub Foundation (Macroentrega 01)`,
  };
}

function controlledMock<T = unknown>(name: string): PortResult<T> {
  return {
    ok: false,
    mode: 'mock',
    code: 'CONTROLLED_MOCK',
    message: `${name} controlled mock — no side effects`,
  };
}

export interface DocumentExtractorPort {
  extract(input: { documentId: string; mimeType?: string }): Promise<PortResult>;
}

export interface OcrPort {
  recognize(input: { documentId: string }): Promise<PortResult>;
}

export interface ContentCleanerPort {
  clean(input: { text: string }): Promise<PortResult<{ text: string }>>;
}

export interface MetadataClassifierPort {
  classify(input: { text: string }): Promise<PortResult>;
}

export interface ChunkingPort {
  chunk(input: { text: string }): Promise<PortResult>;
}

export interface EmbeddingProviderPort {
  embed(input: { texts: string[] }): Promise<PortResult>;
}

export interface VectorStorePort {
  upsert(input: unknown): Promise<PortResult>;
  delete(input: unknown): Promise<PortResult>;
}

export interface WebResearchPort {
  search(input: { query: string }): Promise<PortResult>;
}

export interface CitationPort {
  format(input: unknown): Promise<PortResult>;
}

export interface KnowledgeGraphPort {
  link(input: unknown): Promise<PortResult>;
}

export interface CostMeterPort {
  record(input: unknown): Promise<PortResult>;
}

export interface ProviderBalancePort {
  getBalance(): Promise<PortResult>;
}

export const notImplementedPorts = {
  documentExtractor: {
    extract: async (_input) => notImplemented('DocumentExtractorPort'),
  } satisfies DocumentExtractorPort,
  ocr: {
    recognize: async (_input) => notImplemented('OcrPort'),
  } satisfies OcrPort,
  contentCleaner: {
    clean: async (_input) => controlledMock<{ text: string }>('ContentCleanerPort'),
  } satisfies ContentCleanerPort,
  metadataClassifier: {
    classify: async (_input) => notImplemented('MetadataClassifierPort'),
  } satisfies MetadataClassifierPort,
  chunking: {
    chunk: async (_input) => notImplemented('ChunkingPort'),
  } satisfies ChunkingPort,
  embeddingProvider: {
    embed: async (_input) => notImplemented('EmbeddingProviderPort'),
  } satisfies EmbeddingProviderPort,
  vectorStore: {
    upsert: async (_input) => notImplemented('VectorStorePort'),
    delete: async (_input) => notImplemented('VectorStorePort'),
  } satisfies VectorStorePort,
  webResearch: {
    search: async (_input) => notImplemented('WebResearchPort'),
  } satisfies WebResearchPort,
  citation: {
    format: async (_input) => controlledMock('CitationPort'),
  } satisfies CitationPort,
  knowledgeGraph: {
    link: async (_input) => notImplemented('KnowledgeGraphPort'),
  } satisfies KnowledgeGraphPort,
  costMeter: {
    record: async (_input) => controlledMock('CostMeterPort'),
  } satisfies CostMeterPort,
  providerBalance: {
    getBalance: async () => notImplemented('ProviderBalancePort'),
  } satisfies ProviderBalancePort,
};
