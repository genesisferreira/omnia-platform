import type { HealthStatus, LLMCompletion } from '../../domain/types';
import type { LLMProviderPort } from '../../ports';

export type DeepSeekProviderConfig = {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
  correlationId?: string;
};

export type DeepSeekCompletion = LLMCompletion & {
  latencyMs: number;
  correlationId: string;
  retries: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Adapter DeepSeek — usa API OpenAI-compatible com retry/timeout/correlation.
 * Runtime depende apenas de LLMProviderPort (não acopla SDK).
 */
export class DeepSeekChatProvider implements LLMProviderPort {
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly correlationId: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DeepSeekProviderConfig) {
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? 25_000;
    this.maxRetries = Math.max(0, config.maxRetries ?? 2);
    this.correlationId =
      config.correlationId || `ds-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.deepseek.com/v1').replace(/\/$/, '');
  }

  metadata() {
    return { name: 'deepseek', model: this.model };
  }

  async health(): Promise<HealthStatus> {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), Math.min(this.timeoutMs, 8_000));
      const res = await this.fetchImpl(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        return { ok: false, detail: `HTTP ${res.status}` };
      }
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
  }): Promise<DeepSeekCompletion> {
    let attempt = 0;
    let lastError: Error | null = null;
    const started = Date.now();

    while (attempt <= this.maxRetries) {
      try {
        const result = await this.completeOnce(input);
        return {
          ...result,
          latencyMs: Date.now() - started,
          correlationId: this.correlationId,
          retries: attempt,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const retryable =
          lastError.message.includes('LLM_RATE_LIMIT') ||
          lastError.message.includes('LLM_RETRYABLE') ||
          lastError.message.includes('TIMEOUT');
        if (!retryable || attempt >= this.maxRetries) break;
        await sleep(250 * 2 ** attempt);
        attempt += 1;
      }
    }

    throw new Error(
      `DEEPSEEK_PROVIDER_ERROR:${lastError?.message || 'unknown'} [corr=${this.correlationId}]`,
    );
  }

  private async completeOnce(input: {
    system: string;
    user: string;
    maxTokens: number;
    temperature?: number;
  }): Promise<LLMCompletion> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);

    try {
      const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Request-Id': this.correlationId,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: input.temperature ?? 0.2,
          max_tokens: input.maxTokens,
          messages: [
            { role: 'system', content: input.system },
            { role: 'user', content: input.user },
          ],
        }),
        signal: ctrl.signal,
      });

      if (res.status === 429) {
        throw new Error(`LLM_RATE_LIMIT:429`);
      }
      if (isRetryableStatus(res.status)) {
        throw new Error(`LLM_RETRYABLE:${res.status}`);
      }
      if (!res.ok) {
        const body = await res.text();
        // Nunca logar/propagar a API key; truncar corpo.
        throw new Error(`LLM_HTTP_${res.status}:${body.slice(0, 180)}`);
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
      if (!text) throw new Error('LLM_EMPTY_COMPLETION');

      return {
        text,
        model: this.model,
        provider: 'deepseek',
        promptTokens: Number(json.usage?.prompt_tokens || 0),
        completionTokens: Number(json.usage?.completion_tokens || 0),
        totalTokens: Number(json.usage?.total_tokens || 0),
        finishReason: json.choices?.[0]?.finish_reason || 'stop',
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
