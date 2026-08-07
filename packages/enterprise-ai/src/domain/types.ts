export const ASSISTANT_CATEGORIES = [
  'tutor',
  'commercial',
  'engineering',
  'support',
  'command',
  'general',
] as const;
export type AssistantCategory = (typeof ASSISTANT_CATEGORIES)[number];

export const ASSISTANT_STATUSES = ['draft', 'active', 'deprecated', 'disabled'] as const;
export type AssistantStatus = (typeof ASSISTANT_STATUSES)[number];

export const PROMPT_KINDS = ['system', 'security', 'style', 'domain'] as const;
export type PromptKind = (typeof PROMPT_KINDS)[number];

export type AiModelRecord = {
  id: string;
  key: string;
  provider: string;
  model: string;
  estimatedCostPer1kTokens: number;
  maxContextTokens: number;
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
  name: string;
  description: string;
  ownerCompanyId: string | null;
  category: AssistantCategory;
  version: string;
  status: AssistantStatus;
  icon: string | null;
  language: string;
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
  fallbackBehavior: AssistantConfigRecord['fallbackBehavior'];
  language: string;
};
