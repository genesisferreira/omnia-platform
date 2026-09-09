/**
 * Authorized LMS passages for Tutor grounding (not RAG redesign).
 * Used when native lesson content is in scope — Retrieval-before-Runtime still runs;
 * passages merge as evidence when vector hits are thin or empty for the open lesson.
 */
import type { CitationResult } from '@omnia/retrieval';

import {
  PASSAGE_RELEVANCE_MIN,
  scorePassageRelevance,
} from './passage-relevance';

export type AuthorizedPassage = {
  id: string;
  title?: string | null;
  text: string;
  sourceType: 'lms_lesson' | 'lms_module' | 'knowledge';
  courseId?: string | null;
  lessonId?: string | null;
  moduleId?: string | null;
  schoolKey?: string | null;
};

function stripHtml(raw: string): string {
  return String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split long lesson text into ~800-char passages for guardrail overlap. */
export function chunkAuthorizedText(
  text: string,
  opts: { idPrefix: string; title?: string | null; meta?: Partial<AuthorizedPassage> },
): AuthorizedPassage[] {
  const clean = stripHtml(text);
  if (clean.length < 40) return [];
  const size = 900;
  const out: AuthorizedPassage[] = [];
  for (let i = 0, part = 0; i < clean.length; i += size - 80, part += 1) {
    const slice = clean.slice(i, i + size).trim();
    if (slice.length < 40) continue;
    out.push({
      id: `${opts.idPrefix}:p${part}`,
      title: opts.title ?? null,
      text: slice,
      sourceType: 'lms_lesson',
      ...opts.meta,
    });
    if (out.length >= 6) break;
  }
  return out;
}

/**
 * Select passages that are actually relevant to the question.
 * Does NOT use the first authorized passage just because it exists.
 * Weak single-token domain overlap (e.g. only "refrigerante") is rejected.
 */
export function selectRelevantAuthorizedPassages(
  question: string,
  passages: AuthorizedPassage[] | null | undefined,
  minRelevance = PASSAGE_RELEVANCE_MIN,
): CitationResult[] {
  if (!passages?.length) return [];
  const scored: Array<{ passage: AuthorizedPassage; text: string; relevance: number }> = [];

  for (const p of passages) {
    const text = stripHtml(p.text);
    if (text.length < 40) continue;
    const relevance = scorePassageRelevance(question, text);
    if (relevance < minRelevance) continue;
    scored.push({ passage: p, text, relevance });
  }

  scored.sort((a, b) => b.relevance - a.relevance);

  return scored.slice(0, 4).map(({ passage: p, text, relevance }) => {
    const sim = Math.min(0.92, 0.55 + relevance * 0.4);
    return {
      chunkId: `auth:${p.id}`,
      text,
      score: sim,
      similarity: sim,
      tokenEstimate: Math.max(1, Math.ceil(text.length / 4)),
      language: 'pt-BR',
      tags: [p.sourceType, p.schoolKey || '', `rel:${relevance.toFixed(2)}`].filter(Boolean),
      citation: {
        knowledgeDocumentId: null,
        courseId: p.courseId ?? null,
        moduleId: p.moduleId ?? null,
        lessonId: p.lessonId ?? null,
        learningResourceId: null,
        chunkId: `auth:${p.id}`,
        page: null,
        version: null,
      },
    } satisfies CitationResult;
  });
}

export function mergeRetrievalWithAuthorizedPassages(
  question: string,
  retrievalHits: CitationResult[],
  passages: AuthorizedPassage[] | null | undefined,
): { chunks: CitationResult[]; fromAuthorized: number; fromRetrieval: number } {
  const auth = selectRelevantAuthorizedPassages(question, passages);
  const seen = new Set(retrievalHits.map((h) => h.chunkId));
  const merged = [...retrievalHits];
  for (const h of auth) {
    if (seen.has(h.chunkId)) continue;
    merged.push(h);
    seen.add(h.chunkId);
  }
  return {
    chunks: merged,
    fromAuthorized: auth.length,
    fromRetrieval: retrievalHits.length,
  };
}
