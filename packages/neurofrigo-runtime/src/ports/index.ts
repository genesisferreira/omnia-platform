import type { CitationResult, RetrievalQuery, RetrievalResult } from '@omnia/retrieval';

import type {
  BuiltContext,
  GuardrailLimits,
  HealthStatus,
  LLMCompletion,
  PromptBundle,
  RuntimeIdentity,
  RuntimeRequest,
} from '../domain/types';

/** Adapter para o Retrieval Engine — Runtime nunca importa Payload/pgvector. */
export interface RetrievalPort {
  search(
    query: RetrievalQuery,
    subject: {
      role?: string | null;
      userId?: string | null;
      tenantId?: string | null;
      companyIds?: Array<string | number>;
      channel?: 'portal_chat' | 'admin' | 'system';
    },
  ): Promise<RetrievalResult>;
}

export interface LLMProviderPort {
  complete(input: {
    system: string;
    user: string;
    maxTokens: number;
    temperature?: number;
  }): Promise<LLMCompletion>;
  health(): Promise<HealthStatus>;
  metadata(): { name: string; model: string };
}

export interface ContextBuilderPort {
  build(request: RuntimeRequest): BuiltContext;
}

export interface PromptBuilderPort {
  build(input: {
    question: string;
    context: BuiltContext;
    chunks: CitationResult[];
    limits: GuardrailLimits;
  }): PromptBundle;
}
