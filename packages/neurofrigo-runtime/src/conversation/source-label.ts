import { sanitizeEvidenceText } from './sanitize-evidence';

/**
 * Friendly title for end-user "Ver fontes" (never chunk IDs / fixture names).
 */
export function friendlySourceTitle(input: {
  text?: string | null;
  knowledgeDocumentId?: string | null;
  learningResourceId?: string | null;
  page?: number | null;
  index?: number;
}): string {
  const cleaned = sanitizeEvidenceText(input.text || '');
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim() || cleaned;
  const snippet = firstSentence.slice(0, 72).trim();
  const base = snippet
    ? snippet.endsWith('.')
      ? snippet
      : `${snippet}${firstSentence.length > 72 ? '…' : ''}`
    : `Trecho autorizado ${(input.index ?? 0) + 1}`;
  if (input.page != null && Number.isFinite(input.page)) {
    return `${base} (p. ${input.page})`;
  }
  return base;
}
