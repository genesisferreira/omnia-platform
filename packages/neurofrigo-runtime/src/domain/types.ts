import type { CitationResult, RetrievalResult } from '@omnia/retrieval';

export type RuntimeIdentity = {
  userId?: string | null;
  role?: string | null;
  tenantId?: string | null;
  companyIds?: Array<string | number>;
  language?: string | null;
  /** Perfil textual autorizado (ex.: aluno, técnico). */
  profileLabel?: string | null;
};

export type RuntimeCourseContext = {
  courseId?: string | null;
  courseTitle?: string | null;
  moduleId?: string | null;
  moduleTitle?: string | null;
  lessonId?: string | null;
  lessonTitle?: string | null;
  ownerCompanyId?: string | null;
  /** Objetivos da aula (opcional, autorizado). */
  lessonObjectives?: string | null;
};

/** Turno temporário da sessão (sem memória entre sessões). */
export type ConversationTurn = {
  question: string;
  answer: string;
  chunkIds?: string[];
  intent?: QuestionIntent | null;
};

export type RuntimeRequest = {
  question: string;
  identity: RuntimeIdentity;
  course: RuntimeCourseContext;
  topK?: number;
  /** Histórico da sessão atual apenas. */
  conversationHistory?: ConversationTurn[];
  sessionId?: string | number | null;
  /** Retrieval ACL channel (public Concierge uses portal_public). */
  channel?: 'portal_chat' | 'portal_public' | 'admin' | 'system' | 'command';
};

export type BuiltContext = {
  courseId: string | null;
  courseTitle: string | null;
  moduleId: string | null;
  moduleTitle: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  lessonObjectives: string | null;
  ownerCompanyId: string | null;
  language: string;
  role: string | null;
  userId: string | null;
  tenantId: string | null;
  companyIds: Array<string | number>;
  profileLabel: string | null;
  permissions: string[];
  conversationHistory: ConversationTurn[];
};

export const QUESTION_INTENTS = [
  'conceptual',
  'procedural',
  'comparative',
  'troubleshooting',
  'definition',
  'review',
  'explanation',
  'summary',
] as const;
export type QuestionIntent = (typeof QUESTION_INTENTS)[number];

export type PromptBundle = {
  system: string;
  user: string;
  citationIds: string[];
  estimatedPromptTokens: number;
  intent: QuestionIntent;
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

export type Explainability = {
  sourceCount: number;
  avgScore: number;
  confidence: number;
  documents: Array<{
    chunkId: string;
    knowledgeDocumentId: string | null;
    learningResourceId: string | null;
    page: number | null;
    score: number;
    similarity: number;
  }>;
  retrievalTookMs: number;
  llmTookMs: number;
  intent: QuestionIntent;
  justification: string;
};

export type GroundingScore = {
  score: number;
  sourceCount: number;
  avgSimilarity: number;
  coverage: number;
  contextChars: number;
  confidence: number;
};

export type RuntimeAnswer = {
  text: string;
  formattedText: string;
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
  intent: QuestionIntent | null;
  grounding: GroundingScore | null;
  explainability: Explainability | null;
  retrieval?: Pick<
    RetrievalResult,
    'candidateCount' | 'afterAclCount' | 'recoveredTokens' | 'tookMs'
  > & { llmTookMs?: number };
};

export type GuardrailLimits = {
  maxContextChunks: number;
  maxPromptTokens: number;
  maxCompletionTokens: number;
  timeoutMs: number;
  minSimilarity: number;
  maxHistoryTurns: number;
};

export const DEFAULT_GUARDRAIL_LIMITS: GuardrailLimits = {
  maxContextChunks: 6,
  maxPromptTokens: 3500,
  maxCompletionTokens: 800,
  timeoutMs: 25_000,
  minSimilarity: 0.35,
  maxHistoryTurns: 4,
};

export type HealthStatus = { ok: boolean; detail: string };

export const NOT_FOUND_MESSAGE =
  'Não encontrei essa informação no conteúdo autorizado deste curso. Posso responder apenas com base no material publicado.';
