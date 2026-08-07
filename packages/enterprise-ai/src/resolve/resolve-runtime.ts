import type {
  AiModelRecord,
  AssistantRecord,
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
}): ResolvedAssistantRuntime {
  const { assistant } = input;
  const prompts = pickActivePromptVersions(input.prompts, assistant.key);
  const systemPrompt = composeSystemPrompt(prompts, DEFAULT_SYSTEM);

  const allowed = new Set([
    ...assistant.allowedModelKeys,
    ...(input.allowedModelKeys || []),
  ]);
  if (assistant.config.defaultModelKey) {
    allowed.add(assistant.config.defaultModelKey);
  }

  const candidates = input.models
    .filter((m) => m.status === 'active')
    .filter((m) => allowed.size === 0 || allowed.has(m.key))
    .sort((a, b) => b.priority - a.priority);

  const preferredKey = assistant.config.defaultModelKey;
  const model =
    (preferredKey ? candidates.find((m) => m.key === preferredKey) : null) ||
    candidates[0] ||
    null;

  return {
    assistant,
    model,
    systemPrompt:
      assistant.defaultContext?.trim()
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
    temperature: assistant.config.temperature ?? 0.2,
    requireCitations: assistant.config.requireCitations !== false,
    fallbackBehavior: assistant.config.fallbackBehavior || 'not_found',
    language: assistant.config.defaultLanguage || assistant.language || 'pt-BR',
  };
}
