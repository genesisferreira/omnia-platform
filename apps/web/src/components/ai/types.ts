export type AskAiContext = {
  courseId?: string | number | null;
  courseTitle?: string | null;
  moduleId?: string | number | null;
  moduleTitle?: string | null;
  lessonId?: string | number | null;
  lessonTitle?: string | null;
  lessonObjectives?: string | null;
  ownerCompanyId?: string | number | null;
  language?: string;
  portalArea?: string | null;
  currentRoute?: string | null;
  schoolKey?: string | null;
};

export type AssistantOption = {
  id: string;
  key: string;
  slug?: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string | null;
  avatar?: string | null;
  color?: string | null;
  capabilities?: unknown;
};

export type AiSource = {
  chunkId: string;
  text: string;
  score: number;
  similarity: number;
  citation?: {
    knowledgeDocumentId?: string | null;
    courseId?: string | null;
    lessonId?: string | null;
    learningResourceId?: string | null;
    page?: number | null;
  };
};

export type AiSuggestedAction = {
  label: string;
  question: string;
};

export type AiExplainability = {
  sourceCount: number;
  avgScore: number;
  confidence: number | null;
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
  intent: string;
  justification: string;
};

export type AiChatData = {
  sessionId: string | number;
  assistantId?: string;
  specialistLabel?: string | null;
  text: string;
  sources: AiSource[];
  /** Finite 0..1 or null — never NaN. */
  confidence: number | null;
  tookMs: number;
  model: string;
  provider: string;
  tokens: { prompt: number; completion: number; total: number };
  status: string;
  errorCode?: string | null;
  intent?: string | null;
  grounding?: { score: number } | null;
  explainability?: AiExplainability | null;
  suggestedActions?: AiSuggestedAction[];
  sourceCount?: number;
  proposalMarkdown?: string | null;
  troubleshootingMarkdown?: string | null;
  comparisonMarkdown?: string | null;
  recommendations?: {
    products?: Array<{ title: string; reason?: string }>;
    services?: Array<{ title: string; reason?: string }>;
    courses?: Array<{ title: string; reason?: string }>;
    trainings?: Array<{ title: string; reason?: string }>;
    documents?: Array<{ title: string; reason?: string }>;
    procedures?: Array<{ title: string; reason?: string }>;
    norms?: Array<{ title: string; reason?: string }>;
  } | null;
};

export type AiTurn = { question: string; answer: AiChatData };

export type AiSessionSummary = {
  id: string | number;
  question: string;
  answerText?: string | null;
  status?: string | null;
  intent?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  courseId?: string | number | null;
};

export type UserAiContext = {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  roles: string[];
  tenantId?: string | null;
  companyId?: string | null;
  currentPortalArea?: string | null;
  currentRoute?: string | null;
};
