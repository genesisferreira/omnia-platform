export const ASSISTANT_CATEGORIES = [
  'tutor',
  'commercial',
  'engineering',
  'support',
  'command',
  'concierge',
  'evaluator',
  'general',
  'refrigeration',
  'technology',
  'electrical',
  'assessor',
  'radar',
  'lab',
  'content',
] as const;
export type AssistantCategory = (typeof ASSISTANT_CATEGORIES)[number];

export const ASSISTANT_STATUSES = ['draft', 'active', 'deprecated', 'disabled'] as const;
export type AssistantStatus = (typeof ASSISTANT_STATUSES)[number];

export const ASSISTANT_VISIBILITIES = ['public', 'internal', 'restricted'] as const;
export type AssistantVisibility = (typeof ASSISTANT_VISIBILITIES)[number];

export const PROMPT_KINDS = [
  'system',
  'security',
  'style',
  'domain',
  'compliance',
] as const;
export type PromptKind = (typeof PROMPT_KINDS)[number];

export const PROMPT_STATUSES = ['draft', 'active', 'retired'] as const;
export type PromptStatus = (typeof PROMPT_STATUSES)[number];

export type AiModelRecord = {
  id: string;
  key: string;
  provider: string;
  model: string;
  estimatedCostPer1kTokens: number;
  maxContextTokens: number;
  defaultTemperature: number;
  capabilities: string[];
  status: 'active' | 'disabled';
  priority: number;
};

export type PromptVersionRecord = {
  id: string;
  assistantKey: string;
  kind: PromptKind;
  version: number;
  body: string;
  active: boolean;
  status: PromptStatus;
  author?: string | null;
  changelog?: string | null;
  createdAt?: string;
};

export type AssistantConfigRecord = {
  defaultModelKey: string | null;
  temperature: number;
  maxContextChunks: number;
  maxPromptTokens: number;
  maxCompletionTokens: number;
  minSimilarity: number;
  requireCitations: boolean;
  defaultLanguage: string;
  fallbackBehavior: 'not_found' | 'clarify' | 'escalate';
};

export type AssistantRecord = {
  id: string;
  key: string;
  slug: string;
  name: string;
  description: string;
  ownerCompanyId: string | null;
  category: AssistantCategory;
  version: string;
  status: AssistantStatus;
  icon: string | null;
  avatar: string | null;
  color: string | null;
  visibility: AssistantVisibility;
  language: string;
  promptVersion: string | null;
  modelProfile: string | null;
  allowedModelKeys: string[];
  defaultContext: string | null;
  capabilities: string[];
  config: AssistantConfigRecord;
};

export type AiPolicyRecord = {
  id: string;
  name: string;
  assistantKeys: string[];
  companyIds: string[];
  roles: string[];
  courseIds: string[];
  tenantIds: string[];
  allowedModelKeys: string[];
  requireGrounding: boolean;
  requireExplainability: boolean;
  maxTokensPerDay: number | null;
  priority: number;
  enabled: boolean;
};

export type PolicySubject = {
  role?: string | null;
  userId?: string | null;
  tenantId?: string | null;
  companyIds?: Array<string | number>;
  courseId?: string | null;
};

export type PolicyDecision = {
  allowed: boolean;
  assistantKey: string | null;
  modelKey: string | null;
  matchedPolicyIds: string[];
  requireGrounding: boolean;
  requireExplainability: boolean;
  maxTokensPerDay: number | null;
  reason: string;
  at: string;
};

export type ResolvedAssistantRuntime = {
  assistant: AssistantRecord;
  model: AiModelRecord | null;
  systemPrompt: string;
  limits: {
    maxContextChunks: number;
    maxPromptTokens: number;
    maxCompletionTokens: number;
    minSimilarity: number;
    timeoutMs: number;
    maxHistoryTurns: number;
  };
  temperature: number;
  requireCitations: boolean;
  requireGrounding: boolean;
  requireExplainability: boolean;
  fallbackBehavior: AssistantConfigRecord['fallbackBehavior'];
  language: string;
  policyDecision: PolicyDecision;
};
