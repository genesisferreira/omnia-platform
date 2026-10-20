import type {
  AiModelRecord,
  AssistantRecord,
  PolicyDecision,
  PromptVersionRecord,
  ResolvedAssistantRuntime,
} from '../domain/types';
import { composeSystemPrompt, pickActivePromptVersions } from '../prompts/compose';

const DEFAULT_SYSTEM = `Você é um assistente Omnia. Responda APENAS com base nas FONTES e no CONTEXTO.
Se não encontrar, diga que não há informação no conteúdo autorizado. Não invente.`;

/**
 * Resolve configuração runtime a partir dos registries (dados).
 */
export function resolveAssistantRuntime(input: {
  assistant: AssistantRecord;
  models: AiModelRecord[];
  prompts: PromptVersionRecord[];
  allowedModelKeys?: string[];
  requireGrounding?: boolean;
  requireExplainability?: boolean;
  policyDecision?: PolicyDecision;
}): ResolvedAssistantRuntime {
  const { assistant } = input;
  const prompts = pickActivePromptVersions(input.prompts, assistant.key);
  const systemPrompt = composeSystemPrompt(prompts, DEFAULT_SYSTEM);

  const allowed = new Set([...assistant.allowedModelKeys, ...(input.allowedModelKeys || [])]);
  if (assistant.config.defaultModelKey) {
    allowed.add(assistant.config.defaultModelKey);
  }
  if (assistant.modelProfile) {
    allowed.add(assistant.modelProfile);
  }

  const candidates = input.models
    .filter((m) => m.status === 'active')
    .filter((m) => allowed.size === 0 || allowed.has(m.key))
    .sort((a, b) => b.priority - a.priority);

  const preferredKey = assistant.config.defaultModelKey || assistant.modelProfile;
  const model =
    (preferredKey ? candidates.find((m) => m.key === preferredKey) : null) || candidates[0] || null;

  const temperature = assistant.config.temperature ?? model?.defaultTemperature ?? 0.2;

  const policyDecision: PolicyDecision =
    input.policyDecision ||
    ({
      allowed: true,
      assistantKey: assistant.key,
      modelKey: model?.key ?? null,
      matchedPolicyIds: [],
      requireGrounding: input.requireGrounding !== false,
      requireExplainability: input.requireExplainability !== false,
      maxTokensPerDay: null,
      reason: 'direct_resolve',
      at: new Date().toISOString(),
    } satisfies PolicyDecision);

  return {
    assistant,
    model,
    systemPrompt: assistant.defaultContext?.trim()
      ? `${systemPrompt}\n\n## DEFAULT_CONTEXT\n${assistant.defaultContext.trim()}`
      : systemPrompt,
    limits: {
      maxContextChunks: assistant.config.maxContextChunks || 6,
      maxPromptTokens: assistant.config.maxPromptTokens || 3500,
      maxCompletionTokens: assistant.config.maxCompletionTokens || 800,
      minSimilarity: assistant.config.minSimilarity || 0.35,
      timeoutMs: 25_000,
      maxHistoryTurns: 4,
    },
    temperature,
    requireCitations: assistant.config.requireCitations !== false,
    requireGrounding: input.requireGrounding !== false,
    requireExplainability: input.requireExplainability !== false,
    fallbackBehavior: assistant.config.fallbackBehavior || 'not_found',
    language: assistant.config.defaultLanguage || assistant.language || 'pt-BR',
    policyDecision: {
      ...policyDecision,
      modelKey: model?.key ?? policyDecision.modelKey,
    },
  };
}
