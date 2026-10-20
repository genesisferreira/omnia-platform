import type { HealthStatus, LLMCompletion } from '../../domain/types';
import type { LLMProviderPort } from '../../ports';

export type OpenAiCompatibleChatConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  name?: string;
  fetchImpl?: typeof fetch;
};

/**
 * Adapter HTTP OpenAI-compatible (chat completions).
 * Ativado apenas quando configurado — substituível.
 */
export class OpenAiCompatibleChatProvider implements LLMProviderPort {
  private readonly cfg: Required<
    Pick<OpenAiCompatibleChatConfig, 'apiKey' | 'baseUrl' | 'model' | 'name'>
  > & { fetchImpl: typeof fetch };

  constructor(config: OpenAiCompatibleChatConfig) {
    this.cfg = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl.replace(/\/$/, ''),
      model: config.model,
      name: config.name ?? 'openai-compatible',
      fetchImpl: config.fetchImpl ?? fetch,
    };
  }

  metadata() {
    return { name: this.cfg.name, model: this.cfg.model };
  }

  async health(): Promise<HealthStatus> {
    try {
      await this.complete({
        system: 'ping',
        user: 'ping',
        maxTokens: 5,
      });
      return { ok: true, detail: 'reachable' };
    } catch (err) {
      return {
        ok: false,
        detail: err instanceof Error ? err.message : 'unhealthy',
      };
    }
  }

  async complete(input: {
    system: string;
    user: string;
    maxTokens: number;
    temperature?: number;
  }): Promise<LLMCompletion> {
    const res = await this.cfg.fetchImpl(`${this.cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.cfg.model,
        temperature: input.temperature ?? 0.2,
        max_tokens: input.maxTokens,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 240)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const text = json.choices?.[0]?.message?.content?.trim() || '';
    if (!text) throw new Error('Empty LLM completion');

    return {
      text,
      model: this.cfg.model,
      provider: this.cfg.name,
      promptTokens: Number(json.usage?.prompt_tokens || 0),
      completionTokens: Number(json.usage?.completion_tokens || 0),
      totalTokens: Number(json.usage?.total_tokens || 0),
      finishReason: json.choices?.[0]?.finish_reason || 'stop',
    };
  }
}
