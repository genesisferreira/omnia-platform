import type { EmbeddingProviderPort } from './ports';
import { DeterministicEmbeddingProvider } from './adapters/embedding/deterministic-provider';
import { OpenAiCompatibleEmbeddingProvider } from './adapters/embedding/openai-compatible-provider';
import { DEFAULT_EMBEDDING_DIMENSIONS } from './domain/types';

export type EmbeddingProviderFactoryEnv = {
  RETRIEVAL_EMBEDDING_PROVIDER?: string;
  RETRIEVAL_EMBEDDING_MODEL?: string;
  RETRIEVAL_EMBEDDING_DIMENSIONS?: string;
  RETRIEVAL_EMBEDDING_API_KEY?: string;
  RETRIEVAL_EMBEDDING_BASE_URL?: string;
  OPENAI_API_KEY?: string;
};

/**
 * Factory configurável — nunca importa o provider no domínio.
 */
export function createEmbeddingProvider(
  env: EmbeddingProviderFactoryEnv = process.env as EmbeddingProviderFactoryEnv,
): EmbeddingProviderPort {
  const name = (env.RETRIEVAL_EMBEDDING_PROVIDER || 'deterministic').toLowerCase();
  const dimensions = Number(env.RETRIEVAL_EMBEDDING_DIMENSIONS || DEFAULT_EMBEDDING_DIMENSIONS);

  if (name === 'openai' || name === 'openai-compatible') {
    const apiKey = env.RETRIEVAL_EMBEDDING_API_KEY || env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'RETRIEVAL_EMBEDDING_PROVIDER=openai exige RETRIEVAL_EMBEDDING_API_KEY ou OPENAI_API_KEY',
      );
    }
    return new OpenAiCompatibleEmbeddingProvider({
      apiKey,
      baseUrl: env.RETRIEVAL_EMBEDDING_BASE_URL || 'https://api.openai.com/v1',
      model: env.RETRIEVAL_EMBEDDING_MODEL || 'text-embedding-3-small',
      dimensions,
      name: 'openai-compatible',
    });
  }

  return new DeterministicEmbeddingProvider({
    dimensions,
    model: env.RETRIEVAL_EMBEDDING_MODEL || undefined,
    name: 'deterministic',
  });
}
