import type { LLMProviderPort } from './ports';
import { GroundedExtractiveProvider } from './adapters/llm/grounded-extractive';
import { OpenAiCompatibleChatProvider } from './adapters/llm/openai-compatible';

export type LlmFactoryEnv = {
  NEUROFRIGO_LLM_PROVIDER?: string;
  NEUROFRIGO_LLM_MODEL?: string;
  NEUROFRIGO_LLM_API_KEY?: string;
  NEUROFRIGO_LLM_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
};

export function createLLMProvider(env: LlmFactoryEnv = process.env as LlmFactoryEnv): LLMProviderPort {
  const name = (env.NEUROFRIGO_LLM_PROVIDER || 'grounded').toLowerCase();

  if (name === 'openai' || name === 'openai-compatible' || name === 'deepseek') {
    const apiKey =
      env.NEUROFRIGO_LLM_API_KEY ||
      (name === 'deepseek' ? env.DEEPSEEK_API_KEY : undefined) ||
      env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        `NEUROFRIGO_LLM_PROVIDER=${name} exige NEUROFRIGO_LLM_API_KEY (ou OPENAI_API_KEY/DEEPSEEK_API_KEY)`,
      );
    }
    const baseUrl =
      env.NEUROFRIGO_LLM_BASE_URL ||
      (name === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1');
    const model =
      env.NEUROFRIGO_LLM_MODEL ||
      (name === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini');
    return new OpenAiCompatibleChatProvider({
      apiKey,
      baseUrl,
      model,
      name: name === 'deepseek' ? 'deepseek' : 'openai-compatible',
    });
  }

  return new GroundedExtractiveProvider({
    model: env.NEUROFRIGO_LLM_MODEL || undefined,
  });
}
