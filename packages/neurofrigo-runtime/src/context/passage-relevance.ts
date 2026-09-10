import { significantTokens } from '../guardrails';

/**
 * Tokens that appear widely in HVAC/LMS material and must not alone
 * prove that a passage answers the student's question.
 */
const DOMAIN_GENERIC_TOKENS = new Set([
  'refrigerante',
  'temperatura',
  'pressao',
  'pressões',
  'sistema',
  'equipamento',
  'diagnostico',
  'ciclo',
  'calor',
  'ambiente',
  'operacao',
  'operacional',
  'comercial',
  'industrial',
  'ventilacao',
  'ar',
  'fluxo',
  'campo',
  'tecnico',
  'tecnica',
  'aula',
  'curso',
  'modulo',
  // Keep "primeiro"/"passo" as relevance signals for procedural first-step questions.
  'proxima',
  'proximo',
]);

function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Question tokens that can prove topical relevance (domain-generic alone is weak). */
export function relevanceTokens(question: string): Set<string> {
  const all = significantTokens(question);
  const specific = new Set<string>();
  for (const t of all) {
    if (!DOMAIN_GENERIC_TOKENS.has(t)) specific.add(t);
  }
  // If the question only has domain-generic tokens, keep them — short diagnostic
  // questions like "pressao sozinha" still need a signal.
  return specific.size > 0 ? specific : all;
}

export function countTokenHits(tokens: Set<string>, text: string): number {
  if (!tokens.size) return 0;
  const blob = stripDiacritics(text.toLowerCase());
  let hits = 0;
  for (const token of tokens) {
    if (blob.includes(token)) {
      hits += 1;
      continue;
    }
    if (token.length >= 6 && blob.includes(token.slice(0, 6))) {
      hits += 1;
      continue;
    }
    // Soft stem for PT participles / gerunds (gelando→gela, isolada→isola)
    if (token.length >= 6) {
      const stem4 = token.slice(0, 4);
      if (blob.includes(stem4)) {
        hits += 1;
        continue;
      }
    }
  }
  return hits;
}

/**
 * Lexical relevance of a passage/sentence to a question.
 * Returns 0..1. Threshold for Tutor grounding ≈ 0.34 (see PASSAGE_RELEVANCE_MIN).
 */
export function scorePassageRelevance(question: string, passageText: string): number {
  const tokens = relevanceTokens(question);
  if (!tokens.size) return 0;
  const hits = countTokenHits(tokens, passageText);
  if (hits === 0) return 0;
  const coverage = hits / tokens.size;
  // Need either 2+ overlapping tokens or strong coverage of a short question.
  if (hits < 2 && tokens.size >= 3) return Math.min(0.32, coverage);
  return Math.min(1, coverage + (hits >= 2 ? 0.15 : 0));
}

export const PASSAGE_RELEVANCE_MIN = 0.34;

export function isPassageRelevant(
  question: string,
  passageText: string,
  min = PASSAGE_RELEVANCE_MIN,
): boolean {
  return scorePassageRelevance(question, passageText) >= min;
}

export function rankSentencesByRelevance(
  question: string,
  sentences: string[],
  min = PASSAGE_RELEVANCE_MIN,
): Array<{ text: string; score: number }> {
  return sentences
    .map((text) => ({ text, score: scorePassageRelevance(question, text) }))
    .filter((s) => s.score >= min)
    .sort((a, b) => b.score - a.score);
}
