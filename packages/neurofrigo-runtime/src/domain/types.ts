import type { CitationResult, RetrievalResult } from '@omnia/retrieval';

export type RuntimeIdentity = {
  userId?: string | null;
  role?: string | null;
  tenantId?: string | null;
  companyIds?: Array<string | number>;
  language?: string | null;
};

export type RuntimeCourseContext = {
  courseId?: string | null;
  courseTitle?: string | null;
  moduleId?: string | null;
  moduleTitle?: string | null;
  lessonId?: string | null;
  lessonTitle?: string | null;
  ownerCompanyId?: string | null;
};

export type RuntimeRequest = {
  question: string;
  identity: RuntimeIdentity;
  course: RuntimeCourseContext;
  topK?: number;
};

export type BuiltContext = {
  courseId: string | null;
  courseTitle: string | null;
  moduleId: string | null;
  moduleTitle: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  ownerCompanyId: string | null;
  language: string;
  role: string | null;
  userId: string | null;
  tenantId: string | null;
  companyIds: Array<string | number>;
  permissions: string[];
};

export type PromptBundle = {
  system: string;
  user: string;
  citationIds: string[];
  estimatedPromptTokens: number;
};

export type LLMCompletion = {
  text: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string;
};

export type SourceCitation = {
  chunkId: string;
  text: string;
  score: number;
  similarity: number;
  citation: CitationResult['citation'];
};

export type RuntimeAnswer = {
  text: string;
  sources: SourceCitation[];
  confidence: number;
  tookMs: number;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  status: 'ok' | 'not_found' | 'error' | 'timeout';
  errorCode?: string | null;
  retrieval?: Pick<
    RetrievalResult,
    'candidateCount' | 'afterAclCount' | 'recoveredTokens' | 'tookMs'
  >;
};

export type GuardrailLimits = {
  maxContextChunks: number;
  maxPromptTokens: number;
  maxCompletionTokens: number;
  timeoutMs: number;
  minSimilarity: number;
};

export const DEFAULT_GUARDRAIL_LIMITS: GuardrailLimits = {
  maxContextChunks: 6,
  maxPromptTokens: 3500,
  maxCompletionTokens: 800,
  timeoutMs: 25_000,
  minSimilarity: 0.35,
};

export type HealthStatus = { ok: boolean; detail: string };
