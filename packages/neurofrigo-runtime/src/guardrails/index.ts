import type { CitationResult } from '@omnia/retrieval';

import type { GuardrailLimits } from '../domain/types';
import { DEFAULT_GUARDRAIL_LIMITS, NOT_FOUND_MESSAGE } from '../domain/types';

export type GuardrailDecision =
  | { ok: true; chunks: CitationResult[] }
  | {
      ok: false;
      code: 'EMPTY_QUESTION' | 'NO_SOURCES' | 'LOW_CONFIDENCE' | 'OFF_TOPIC';
      message: string;
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
  'conteúdo',
  'curso',
  'aula',
  'modulo',
  'módulo',
  'documento',
  'informacao',
  'informação',
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
]);

export function significantTokens(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const out = new Set<string>();
  for (const raw of normalized.split(/[^a-z0-9]+/i)) {
    if (raw.length < 4) continue;
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
    .map((c) =>
      c.text
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, ''),
    )
    .join(' ');

  for (const token of qTokens) {
    if (docBlob.includes(token)) return true;
    // Prefixo (ex.: termostatica ≈ termostatico)
    if (token.length >= 5) {
      const prefix = token.slice(0, Math.min(6, token.length));
      if (docBlob.includes(prefix)) return true;
    }
  }
  return false;
}

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
      message: NOT_FOUND_MESSAGE,
    };
  }

  const best = filtered[0]!;
  if ((best.similarity ?? best.score) < limits.minSimilarity) {
    return {
      ok: false,
      code: 'LOW_CONFIDENCE',
      message: NOT_FOUND_MESSAGE,
    };
  }

  if (!hasLexicalOverlap(q, filtered)) {
    return {
      ok: false,
      code: 'OFF_TOPIC',
      message: NOT_FOUND_MESSAGE,
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
