import type { LLMProviderPort } from './ports';
import { GroundedExtractiveProvider } from './adapters/llm/grounded-extractive';
import { OpenAiCompatibleChatProvider } from './adapters/llm/openai-compatible';
import { DeepSeekChatProvider } from './adapters/llm/deepseek';

export type LlmFactoryEnv = {
  NEUROFRIGO_LLM_PROVIDER?: string;
  NEUROFRIGO_LLM_MODEL?: string;
  NEUROFRIGO_LLM_API_KEY?: string;
  NEUROFRIGO_LLM_BASE_URL?: string;
  NEUROFRIGO_LLM_FALLBACK?: string;
  OPENAI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
};

export type LlmProviderOverrides = {
  provider?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
  correlationId?: string;
};

export type CreatedLlmProvider = {
  provider: LLMProviderPort;
  providerRequested: string;
  providerUsed: string;
  fallbackReason: string | null;
};

function resolveApiKey(
  name: string,
  env: LlmFactoryEnv,
  overrides?: LlmProviderOverrides,
): string | null {
  return (
    overrides?.apiKey ||
    env.NEUROFRIGO_LLM_API_KEY ||
    (name === 'deepseek' ? env.DEEPSEEK_API_KEY : undefined) ||
    env.OPENAI_API_KEY ||
    null
  );
}

function buildPrimary(
  name: string,
  env: LlmFactoryEnv,
  overrides?: LlmProviderOverrides,
): LLMProviderPort {
  if (name === 'deepseek') {
    const apiKey = resolveApiKey(name, env, overrides);
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY_MISSING');
    }
    return new DeepSeekChatProvider({
      apiKey,
      model: overrides?.model || env.NEUROFRIGO_LLM_MODEL || 'deepseek-chat',
      baseUrl: overrides?.baseUrl || env.NEUROFRIGO_LLM_BASE_URL || 'https://api.deepseek.com/v1',
      timeoutMs: overrides?.timeoutMs,
      maxRetries: overrides?.maxRetries,
      correlationId: overrides?.correlationId,
    });
  }

  if (name === 'openai' || name === 'openai-compatible') {
    const apiKey = resolveApiKey(name, env, overrides);
    if (!apiKey) {
      throw new Error(
        `NEUROFRIGO_LLM_PROVIDER=${name} exige NEUROFRIGO_LLM_API_KEY (ou OPENAI_API_KEY)`,
      );
    }
    return new OpenAiCompatibleChatProvider({
      apiKey,
      baseUrl: overrides?.baseUrl || env.NEUROFRIGO_LLM_BASE_URL || 'https://api.openai.com/v1',
      model: overrides?.model || env.NEUROFRIGO_LLM_MODEL || 'gpt-4o-mini',
      name: 'openai-compatible',
    });
  }

  return new GroundedExtractiveProvider({
    model: overrides?.model || env.NEUROFRIGO_LLM_MODEL || undefined,
  });
}

/**
 * Cria provider LLM desacoplado.
 * Fallback para grounded somente se NEUROFRIGO_LLM_FALLBACK=grounded e com auditoria explícita.
 */
export function createLLMProviderWithMeta(
  env: LlmFactoryEnv = process.env as LlmFactoryEnv,
  overrides?: LlmProviderOverrides,
): CreatedLlmProvider {
  const providerRequested = (
    overrides?.provider ||
    env.NEUROFRIGO_LLM_PROVIDER ||
    'grounded'
  ).toLowerCase();

  try {
    const provider = buildPrimary(providerRequested, env, overrides);
    return {
      provider,
      providerRequested,
      providerUsed: provider.metadata().name,
      fallbackReason: null,
    };
  } catch (err) {
    const fallback = (env.NEUROFRIGO_LLM_FALLBACK || 'none').toLowerCase();
    const reason = err instanceof Error ? err.message : 'provider_error';
    if (fallback === 'grounded' && providerRequested !== 'grounded') {
      const provider = new GroundedExtractiveProvider({
        model: overrides?.model || env.NEUROFRIGO_LLM_MODEL || undefined,
      });
      return {
        provider,
        providerRequested,
        providerUsed: 'grounded',
        fallbackReason: reason,
      };
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/** Compat Epic 05–08: retorna só o port. */
export function createLLMProvider(
  env: LlmFactoryEnv = process.env as LlmFactoryEnv,
  overrides?: LlmProviderOverrides,
): LLMProviderPort {
  return createLLMProviderWithMeta(env, overrides).provider;
}
