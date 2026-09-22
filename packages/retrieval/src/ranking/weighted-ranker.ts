import type { RankedHit, VectorSearchHit } from '../domain/types';
import type { RankerPort } from '../ports';

export type RankingWeights = {
  similarity: number;
  courseBoost: number;
  lessonBoost: number;
  moduleBoost: number;
  versionBoost: number;
  priorityBoost: number;
  recencyBoost: number;
};

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  similarity: 1,
  courseBoost: 0.08,
  lessonBoost: 0.12,
  moduleBoost: 0.05,
  versionBoost: 0.03,
  priorityBoost: 0.02,
  recencyBoost: 0.04,
};

/**
 * Ranking desacoplado do Retriever.
 * Evolui sem alterar o fluxo de busca vetorial.
 */
export class WeightedRanker implements RankerPort {
  constructor(private readonly weights: RankingWeights = DEFAULT_RANKING_WEIGHTS) {}

  rank(
    hits: VectorSearchHit[],
    context: {
      courseId?: string | null;
      lessonId?: string | null;
      moduleId?: string | null;
    },
  ): RankedHit[] {
    const now = Date.now();
    const ranked = hits.map((hit) => {
      const reasons: string[] = [`similarity=${hit.similarity.toFixed(4)}`];
      let score = hit.similarity * this.weights.similarity;

      if (context.courseId && hit.record.courseId === context.courseId) {
        score += this.weights.courseBoost;
        reasons.push('course_match');
      }
      if (context.moduleId && hit.record.moduleId === context.moduleId) {
        score += this.weights.moduleBoost;
        reasons.push('module_match');
      }
      if (context.lessonId && hit.record.lessonId === context.lessonId) {
        score += this.weights.lessonBoost;
        reasons.push('lesson_match');
      }

      if (hit.record.version) {
        score +=
          this.weights.versionBoost * Math.min(1, Number.parseFloat(hit.record.version) || 0.5);
        reasons.push(`version=${hit.record.version}`);
      }

      const priority = hit.record.priority ?? 0;
      if (priority > 0) {
        score += this.weights.priorityBoost * Math.min(1, priority / 10);
        reasons.push(`priority=${priority}`);
      }

      if (hit.record.updatedAt || hit.record.createdAt) {
        const ts = Date.parse(hit.record.updatedAt || hit.record.createdAt || '');
        if (!Number.isNaN(ts)) {
          const ageDays = Math.max(0, (now - ts) / (1000 * 60 * 60 * 24));
          const recency = Math.max(0, 1 - ageDays / 365);
          score += this.weights.recencyBoost * recency;
          reasons.push(`recency=${recency.toFixed(2)}`);
        }
      }

      return {
        record: hit.record,
        similarity: hit.similarity,
        rankScore: score,
        rankReasons: reasons,
      };
    });

    ranked.sort((a, b) => b.rankScore - a.rankScore);
    return ranked;
  }
}
