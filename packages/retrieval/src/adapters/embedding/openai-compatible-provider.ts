import type { HealthStatus, ProviderMetadata } from '../../domain/types';
import type { EmbeddingProviderPort } from '../../ports';

export type OpenAiCompatibleConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  dimensions: number;
  name?: string;
  maxBatchSize?: number;
  fetchImpl?: typeof fetch;
};

/**
 * Adapter HTTP OpenAI-compatible (substituível).
 * Não é usado por default — requer configuração explícita.
 */
export class OpenAiCompatibleEmbeddingProvider implements EmbeddingProviderPort {
  private readonly cfg: Required<
    Pick<
      OpenAiCompatibleConfig,
      'apiKey' | 'baseUrl' | 'model' | 'dimensions' | 'name' | 'maxBatchSize'
    >
  > & { fetchImpl: typeof fetch };

  constructor(config: OpenAiCompatibleConfig) {
    this.cfg = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl.replace(/\/$/, ''),
      model: config.model,
      dimensions: config.dimensions,
      name: config.name ?? 'openai-compatible',
      maxBatchSize: config.maxBatchSize ?? 32,
      fetchImpl: config.fetchImpl ?? fetch,
    };
  }

  metadata(): ProviderMetadata {
    return {
      name: this.cfg.name,
      model: this.cfg.model,
      dimensions: this.cfg.dimensions,
      maxBatchSize: this.cfg.maxBatchSize,
    };
  }

  async health(): Promise<HealthStatus> {
    try {
      await this.generate('health-check');
      return { ok: true, detail: 'provider reachable' };
    } catch (err) {
      return {
        ok: false,
        detail: err instanceof Error ? err.message : 'provider unhealthy',
      };
    }
  }

  async generate(text: string): Promise<number[]> {
    const [vec] = await this.generateBatch([text]);
    if (!vec) throw new Error('Empty embedding response');
    return vec;
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += this.cfg.maxBatchSize) {
      const input = texts.slice(i, i + this.cfg.maxBatchSize);
      const res = await this.cfg.fetchImpl(`${this.cfg.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.cfg.model,
          input,
          dimensions: this.cfg.dimensions,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Embedding provider HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const json = (await res.json()) as {
        data?: Array<{ embedding?: number[]; index?: number }>;
      };
      const data = [...(json.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      for (const row of data) {
        if (!row.embedding?.length) throw new Error('Missing embedding in provider response');
        out.push(row.embedding);
      }
    }
    return out;
  }
}
