import type { CitationResult } from '@omnia/retrieval';

import type { GuardrailLimits } from '../domain/types';
import { DEFAULT_GUARDRAIL_LIMITS, resolveNotFoundMessage } from '../domain/types';

export type GuardrailDecision =
  | { ok: true; chunks: CitationResult[] }
  | {
      ok: false;
      code: 'EMPTY_QUESTION' | 'NO_SOURCES' | 'LOW_CONFIDENCE' | 'OFF_TOPIC';
      message: string;
    };

export type GuardrailContext = {
  assistantKey?: string | null;
  channel?: string | null;
  courseId?: string | null;
  portalArea?: string | null;
};

/** Tokens genéricos que não provam relevância ao conteúdo técnico. */
const GENERIC_TOKENS = new Set([
  'qual',
  'quais',
  'como',
  'onde',
  'quando',
  'porque',
  'porquê',
  'sobre',
  'material',
  'conteudo',
  'curso',
  'aula',
  'modulo',
  'documento',
  'informacao',
  'autorizado',
  'publicado',
  'segundo',
  'deste',
  'desta',
  'neste',
  'nesta',
  'base',
  'pdf',
  'texto',
  'resposta',
  'pergunta',
  'jogo',
  'contra',
]);

function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function significantTokens(text: string): Set<string> {
  const normalized = stripDiacritics(text.toLowerCase());
  const out = new Set<string>();
  for (const raw of normalized.split(/[^a-z0-9]+/)) {
    if (raw.length < 5) continue;
    if (GENERIC_TOKENS.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

export function hasLexicalOverlap(question: string, chunks: CitationResult[]): boolean {
  const qTokens = significantTokens(question);
  if (qTokens.size === 0) return true;

  const docBlob = chunks
    .slice(0, 4)
    .map((c) => stripDiacritics((c.text || '').toLowerCase()))
    .join(' ');

  for (const token of qTokens) {
    if (docBlob.includes(token)) return true;
    if (token.length >= 6) {
      const prefix = token.slice(0, 6);
      if (docBlob.includes(prefix)) return true;
    }
  }
  return false;
}

export function applyRetrievalGuardrails(
  question: string,
  chunks: CitationResult[],
  limits: GuardrailLimits = DEFAULT_GUARDRAIL_LIMITS,
  context: GuardrailContext = {},
): GuardrailDecision {
  const q = question.trim();
  if (!q) {
    return { ok: false, code: 'EMPTY_QUESTION', message: 'Pergunta vazia.' };
  }

  const notFound = resolveNotFoundMessage(context);

  const filtered = chunks
    .filter((c) => (c.similarity ?? c.score) >= limits.minSimilarity)
    .slice(0, limits.maxContextChunks);

  if (!filtered.length) {
    return {
      ok: false,
      code: 'NO_SOURCES',
      message: notFound,
    };
  }

  const best = filtered[0]!;
  if ((best.similarity ?? best.score) < limits.minSimilarity) {
    return {
      ok: false,
      code: 'LOW_CONFIDENCE',
      message: notFound,
    };
  }

  if (!hasLexicalOverlap(q, filtered)) {
    return {
      ok: false,
      code: 'OFF_TOPIC',
      message: notFound,
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

export function estimateCostUsd(
  totalTokens: number,
  provider: string,
  costPer1kTokens?: number | null,
): number {
  if (provider === 'grounded' || provider === 'extractive') return 0;
  const rate =
    costPer1kTokens != null && Number.isFinite(costPer1kTokens) ? Number(costPer1kTokens) : 0.0002;
  return Number(((totalTokens / 1000) * rate).toFixed(6));
}

export function computeConfidence(chunks: CitationResult[]): number {
  if (!chunks.length) return 0;
  const top = chunks.slice(0, 3);
  const avg = top.reduce((s, c) => s + (c.similarity ?? Math.min(1, c.score)), 0) / top.length;
  return Math.max(0, Math.min(1, Number(avg.toFixed(3))));
}
