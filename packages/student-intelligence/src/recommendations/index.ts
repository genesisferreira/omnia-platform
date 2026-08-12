import type {
  CompetencyState,
  EvidenceRecord,
  PreferenceState,
  SipRecommendation,
  SipEvidenceInput,
} from '../domain/types';

/**
 * Recommendation Engine — gera recomendações a partir de competências/gaps/catálogo.
 * Assistentes apenas consomem; não inventam plano paralelo.
 */
export function buildSipRecommendations(input: {
  competencies: CompetencyState[];
  preferences: PreferenceState[];
  signals: SipEvidenceInput;
  catalogHints?: Array<{ id: string; title: string; competencyKey?: string | null }>;
  courseId?: string | null;
}): SipRecommendation[] {
  const out: SipRecommendation[] = [];
  const gaps = [...input.competencies].sort((a, b) => a.score - b.score).slice(0, 3);
  const topPref = input.preferences[0]?.key;

  for (const gap of gaps) {
    if (gap.score >= 0.55) continue;
    out.push({
      type: 'review',
      title: `Revisar ${gap.label}`,
      reason: `Competência com score ${(gap.score * 100).toFixed(0)}% e tendência ${gap.trend}.`,
      confidence: gap.confidence,
      competencyKey: gap.key,
      courseId: input.courseId ?? null,
    });
  }

  for (const topic of input.signals.difficultyTopics.slice(0, 3)) {
    out.push({
      type: 'content',
      title: `Conteúdo de reforço: ${topic}`,
      reason: 'Tópico marcado como dificuldade no histórico de aprendizagem.',
      confidence: 0.6,
      courseId: input.courseId ?? null,
    });
  }

  for (const hint of (input.catalogHints || []).slice(0, 5)) {
    const relatedGap = gaps.find(
      (g) =>
        g.score < 0.55 &&
        (hint.competencyKey === g.key ||
          hint.title.toLowerCase().includes(g.key.replace(/-/g, ' '))),
    );
    if (!relatedGap && out.length >= 4) continue;
    out.push({
      type: 'material',
      title: hint.title,
      reason: relatedGap
        ? `Alinhado à lacuna em ${relatedGap.label}.`
        : 'Material do catálogo alinhado ao progresso atual.',
      confidence: relatedGap ? 0.7 : 0.45,
      competencyKey: relatedGap?.key ?? hint.competencyKey ?? null,
      lessonId: hint.id,
      courseId: input.courseId ?? null,
    });
  }

  if (input.signals.pendingTopics.length) {
    out.push({
      type: 'study_plan',
      title: 'Plano de estudo sugerido',
      reason: `Priorizar: ${input.signals.pendingTopics.slice(0, 3).join(', ')}.`,
      confidence: 0.55,
      courseId: input.courseId ?? null,
    });
  }

  if (topPref === 'pratico') {
    out.push({
      type: 'exercise',
      title: 'Exercícios práticos',
      reason: 'Preferência inferida: aprendizagem prática.',
      confidence: input.preferences[0]?.confidence ?? 0.4,
      courseId: input.courseId ?? null,
    });
  }

  // Dedup by title
  const seen = new Set<string>();
  return out
    .filter((r) => {
      const k = r.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 8);
}

export function nextStepsFromRecommendations(recs: SipRecommendation[]): string[] {
  return recs.slice(0, 4).map((r) => r.title);
}
