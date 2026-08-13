const INTERNAL_MARKERS = [
  /EPIC16_PUBLIC_INSTITUTIONAL_V\d+/gi,
  /\[chunk:[^\]]+\]/gi,
  /\bRAG\b/g,
  /\bVector\s*topK\b/gi,
  /\bpolicyDecision\b/gi,
  /\bretrieval\s+pipeline\b/gi,
];

/**
 * Strip fixture markers / chunk IDs / RAG internals from evidence text.
 */
export function sanitizeEvidenceText(text: string): string {
  let out = String(text || '');
  for (const re of INTERNAL_MARKERS) {
    out = out.replace(re, ' ');
  }
  out = out
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return out;
}

export function looksLikeInternalLeak(text: string): boolean {
  return (
    /EPIC16_PUBLIC/i.test(text) ||
    /\[chunk:\d+/i.test(text) ||
    /Pontos principais do material/i.test(text) ||
    /\b(RAG|Citations|Routing|Vector Search|PromptBuilder|Policy Engine)\b/.test(text)
  );
}
