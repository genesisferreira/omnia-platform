import type {
  CompetencyState,
  EvidenceRecord,
  SipEvidenceInput,
  StudentInsights,
} from '../domain/types';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Student Insights — indicadores educacionais auditáveis (sem diagnósticos clínicos).
 */
export function computeInsights(input: {
  competencies: CompetencyState[];
  evidence: EvidenceRecord[];
  signals: SipEvidenceInput;
  now?: string;
}): StudentInsights {
  const now = input.now || new Date().toISOString();
  const comps = input.competencies;
  const avgScore =
    comps.length === 0 ? 0 : comps.reduce((s, c) => s + c.score, 0) / comps.length;
  const avgConf =
    comps.length === 0 ? 0 : comps.reduce((s, c) => s + c.confidence, 0) / comps.length;

  const imt = clamp01(avgScore * 0.7 + avgConf * 0.3);
  const learningVelocity = clamp01(
    Math.min(1, input.signals.aiUsageCount / 20) * 0.5 +
      clamp01(input.signals.progressPercent / 100) * 0.5,
  );
  const knowledgeRetention = clamp01(
    0.4 +
      avgScore * 0.4 -
      Math.min(0.3, input.signals.difficultyTopics.length * 0.05) +
      Math.min(0.2, input.signals.masteredTopics.length * 0.03),
  );
  const confidenceIndex = clamp01(
    avgConf * 0.6 + clamp01(input.signals.avgGrounding) * 0.4,
  );
  const reviewRisk = clamp01(
    1 -
      knowledgeRetention * 0.5 -
      clamp01(1 - input.signals.difficultyTopics.length / 10) * 0.3 +
      Math.min(0.2, input.signals.negativeFeedbackCount * 0.04),
  );
  const lowCount = comps.filter((c) => c.score < 0.45).length;
  const skillGap = clamp01(lowCount / Math.max(comps.length, 1));

  return {
    imt: Number(imt.toFixed(3)),
    learningVelocity: Number(learningVelocity.toFixed(3)),
    knowledgeRetention: Number(knowledgeRetention.toFixed(3)),
    confidenceIndex: Number(confidenceIndex.toFixed(3)),
    reviewRisk: Number(reviewRisk.toFixed(3)),
    skillGap: Number(skillGap.toFixed(3)),
    computedAt: now,
    explainability: [
      {
        metric: 'imt',
        basis: `Média de competências (${comps.length}) ponderada por confidence.`,
        confidence: avgConf,
      },
      {
        metric: 'learningVelocity',
        basis: `Uso Tutor (${input.signals.aiUsageCount}) + progresso LMS (${Math.round(input.signals.progressPercent)}%).`,
        confidence: 0.6,
      },
      {
        metric: 'knowledgeRetention',
        basis: `Dominados vs dificuldades (${input.signals.masteredTopics.length}/${input.signals.difficultyTopics.length}).`,
        confidence: 0.55,
      },
      {
        metric: 'confidenceIndex',
        basis: `Confidence das competências + grounding médio ${input.signals.avgGrounding.toFixed(2)}.`,
        confidence: avgConf,
      },
      {
        metric: 'reviewRisk',
        basis: 'Inverso da retenção + volume de tópicos difíceis + feedback negativo.',
        confidence: 0.5,
      },
      {
        metric: 'skillGap',
        basis: `${lowCount} competências abaixo de 0.45.`,
        confidence: 0.7,
      },
    ],
  };
}
