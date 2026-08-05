import type { HealthStatus, ProviderMetadata } from '../../domain/types';
import { DEFAULT_EMBEDDING_DIMENSIONS, DEFAULT_EMBEDDING_MODEL, DEFAULT_EMBEDDING_PROVIDER } from '../../domain/types';
import { l2Normalize } from '../../domain/utils';
import type { EmbeddingProviderPort } from '../../ports';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
}

function hashToIndex(token: string, dimensions: number): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % dimensions;
}

/**
 * Provider determinístico local — sem LLM / sem rede.
 * Útil para homologação e como default configurável.
 */
export class DeterministicEmbeddingProvider implements EmbeddingProviderPort {
  private readonly dimensions: number;
  private readonly model: string;
  private readonly name: string;
  private readonly maxBatchSize: number;

  constructor(opts?: {
    dimensions?: number;
    model?: string;
    name?: string;
    maxBatchSize?: number;
  }) {
    this.dimensions = opts?.dimensions ?? DEFAULT_EMBEDDING_DIMENSIONS;
    this.model = opts?.model ?? DEFAULT_EMBEDDING_MODEL;
    this.name = opts?.name ?? DEFAULT_EMBEDDING_PROVIDER;
    this.maxBatchSize = opts?.maxBatchSize ?? 64;
  }

  metadata(): ProviderMetadata {
    return {
      name: this.name,
      model: this.model,
      dimensions: this.dimensions,
      maxBatchSize: this.maxBatchSize,
    };
  }

  async health(): Promise<HealthStatus> {
    return { ok: true, detail: `${this.name}/${this.model} ready` };
  }

  async generate(text: string): Promise<number[]> {
    const vec = new Array<number>(this.dimensions).fill(0);
    const tokens = tokenize(text);
    if (tokens.length === 0) {
      vec[0] = 1;
      return l2Normalize(vec);
    }
    for (const token of tokens) {
      const idx = hashToIndex(token, this.dimensions);
      const sign = hashToIndex(`s:${token}`, 2) === 0 ? 1 : -1;
      vec[idx] = (vec[idx] ?? 0) + sign;
      // bigram soft signal
      const idx2 = hashToIndex(`2:${token}`, this.dimensions);
      vec[idx2] = (vec[idx2] ?? 0) + 0.5 * sign;
    }
    return l2Normalize(vec);
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += this.maxBatchSize) {
      const slice = texts.slice(i, i + this.maxBatchSize);
      for (const t of slice) {
        out.push(await this.generate(t));
      }
    }
    return out;
  }
}
