import type { CitationResult } from '@omnia/retrieval';

import type { GuardrailLimits } from '../domain/types';
import { DEFAULT_GUARDRAIL_LIMITS } from '../domain/types';

export type GuardrailDecision =
  | { ok: true; chunks: CitationResult[] }
  | { ok: false; code: 'EMPTY_QUESTION' | 'NO_SOURCES' | 'LOW_CONFIDENCE'; message: string };

export function applyRetrievalGuardrails(
  question: string,
  chunks: CitationResult[],
  limits: GuardrailLimits = DEFAULT_GUARDRAIL_LIMITS,
): GuardrailDecision {
  const q = question.trim();
  if (!q) {
    return { ok: false, code: 'EMPTY_QUESTION', message: 'Pergunta vazia.' };
  }

  const filtered = chunks
    .filter((c) => (c.similarity ?? c.score) >= limits.minSimilarity)
    .slice(0, limits.maxContextChunks);

  if (!filtered.length) {
    return {
      ok: false,
      code: 'NO_SOURCES',
      message:
        'Não encontrei informações suficientes na base de conhecimento autorizada para este curso.',
    };
  }

  const best = filtered[0]!;
  if ((best.similarity ?? best.score) < limits.minSimilarity) {
    return {
      ok: false,
      code: 'LOW_CONFIDENCE',
      message: 'Não encontrei trechos relevantes o bastante na base do curso.',
    };
  }

  return { ok: true, chunks: filtered };
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function estimateCostUsd(totalTokens: number, provider: string): number {
  // Estimativa conservadora; Grounded = 0
  if (provider === 'grounded' || provider === 'extractive') return 0;
  return Number(((totalTokens / 1000) * 0.0002).toFixed(6));
}

export function computeConfidence(chunks: CitationResult[]): number {
  if (!chunks.length) return 0;
  const top = chunks.slice(0, 3);
  const avg =
    top.reduce((s, c) => s + (c.similarity ?? Math.min(1, c.score)), 0) / top.length;
  return Math.max(0, Math.min(1, Number(avg.toFixed(3))));
}
