/**
 * Authorized LMS passages for Tutor grounding (not RAG redesign).
 * Used when native lesson content is in scope — Retrieval-before-Runtime still runs;
 * passages merge as evidence when vector hits are thin or empty for the open lesson.
 */
import type { CitationResult } from '@omnia/retrieval';

import { hasLexicalOverlap, significantTokens } from '../guardrails';

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
 * Select passages that lexically overlap the question (same spirit as retrieval guardrails).
 * Score is high enough to pass minSimilarity (0.35) without inventing vector hits.
 */
export function selectRelevantAuthorizedPassages(
  question: string,
  passages: AuthorizedPassage[] | null | undefined,
): CitationResult[] {
  if (!passages?.length) return [];
  const qTokens = significantTokens(question);
  const hits: CitationResult[] = [];

  for (const p of passages) {
    const text = stripHtml(p.text);
    if (text.length < 40) continue;
    const asCitation: CitationResult = {
      chunkId: `auth:${p.id}`,
      text,
      score: 0.82,
      similarity: 0.82,
      tokenEstimate: Math.max(1, Math.ceil(text.length / 4)),
      language: 'pt-BR',
      tags: [p.sourceType, p.schoolKey || ''].filter(Boolean),
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
    };
    if (qTokens.size === 0 || hasLexicalOverlap(question, [asCitation])) {
      hits.push(asCitation);
    }
  }

  // If nothing overlapped but we have a single rich lesson body, keep top passage
  // only when question tokens appear in the combined blob (prefix match already in hasLexicalOverlap).
  if (!hits.length && passages.length) {
    const blob = passages.map((p) => stripHtml(p.text)).join(' ');
    const fake: CitationResult = {
      chunkId: `auth:${passages[0]!.id}`,
      text: blob.slice(0, 1200),
      score: 0.7,
      similarity: 0.7,
      tokenEstimate: 300,
      language: 'pt-BR',
      tags: ['lms_lesson'],
      citation: {
        knowledgeDocumentId: null,
        courseId: passages[0]!.courseId ?? null,
        moduleId: passages[0]!.moduleId ?? null,
        lessonId: passages[0]!.lessonId ?? null,
        learningResourceId: null,
        chunkId: `auth:${passages[0]!.id}`,
        page: null,
        version: null,
      },
    };
    if (hasLexicalOverlap(question, [fake])) hits.push(fake);
  }

  return hits.slice(0, 4);
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
