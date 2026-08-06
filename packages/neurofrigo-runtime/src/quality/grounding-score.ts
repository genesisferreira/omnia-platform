import type { CitationResult } from '@omnia/retrieval';

import type { GroundingScore } from '../domain/types';

/**
 * Grounding Score — qualidade de ancoragem nas fontes (0–1).
 */
export function computeGroundingScore(input: {
  chunks: CitationResult[];
  confidence: number;
  contextChars: number;
}): GroundingScore {
  const { chunks, confidence, contextChars } = input;
  if (!chunks.length) {
    return {
      score: 0,
      sourceCount: 0,
      avgSimilarity: 0,
      coverage: 0,
      contextChars,
      confidence: 0,
    };
  }

  const sims = chunks.map((c) => c.similarity ?? Math.min(1, c.score));
  const avgSimilarity = sims.reduce((a, b) => a + b, 0) / sims.length;
  const sourceCountFactor = Math.min(1, chunks.length / 4);
  const coverage = Math.min(1, contextChars / 2400);
  const score = Number(
    (
      avgSimilarity * 0.45 +
      confidence * 0.25 +
      sourceCountFactor * 0.2 +
      coverage * 0.1
    ).toFixed(3),
  );

  return {
    score: Math.max(0, Math.min(1, score)),
    sourceCount: chunks.length,
    avgSimilarity: Number(avgSimilarity.toFixed(3)),
    coverage: Number(coverage.toFixed(3)),
    contextChars,
    confidence,
  };
}
