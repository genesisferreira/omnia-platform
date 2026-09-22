import type { SchoolKey } from './schools';
import type { PcarProfile } from './pcar';
import type { DomainEstimate } from './assessment';
import type { CompetencySnapshot } from './sipe';

export type AttentionSignal = {
  code: string;
  evidence: string;
};

export type Student360 = {
  identity: {
    studentId: number;
    schoolKey: SchoolKey | null;
    displayName: string | null;
  };
  baseline: {
    pcar: PcarProfile | null;
    goals: string[];
    initialOverall: number | null;
    domains: DomainEstimate[];
  };
  academic: {
    enrollments: number;
    progressPercent: number;
    completedLessons: number;
    publishedGrades: number;
    certificates: number;
  };
  competencies: CompetencySnapshot[];
  evolution: Array<{ key: string; from: number | null; to: number; at: string }>;
  learning: {
    recommendations: string[];
    interventions: number;
  };
  engagement: {
    lastAcademicAt: string | null;
    inactiveDays: number | null;
  };
  imt: {
    status: 'ok' | 'insufficient';
    value: number | null;
    formula: string;
    composition: Array<{ key: string; weight: number; score: number }>;
  };
  ai: {
    allowedContext: string[];
  };
};

/**
 * IMT V1 = média ponderada (score × confidence × evidenceCount) das competências
 * com evidenceCount ≥ 2. Se evidência total < 4, status=insufficient (não inventa número).
 */
export const IMT_FORMULA =
  'sum(score * confidence * evidenceCount) / sum(confidence * evidenceCount) para competências com evidenceCount>=2; insuficiente se soma(evidenceCount)<4';

export function computeImt(competencies: CompetencySnapshot[]): Student360['imt'] {
  const usable = competencies.filter((c) => c.evidenceCount >= 2);
  const totalEvidence = competencies.reduce((s, c) => s + c.evidenceCount, 0);
  if (totalEvidence < 4 || !usable.length) {
    return { status: 'insufficient', value: null, formula: IMT_FORMULA, composition: [] };
  }
  const denom = usable.reduce((s, c) => s + c.confidence * c.evidenceCount, 0);
  const num = usable.reduce((s, c) => s + c.score * c.confidence * c.evidenceCount, 0);
  const value = denom > 0 ? Math.round(num / denom) : null;
  return {
    status: value == null ? 'insufficient' : 'ok',
    value,
    formula: IMT_FORMULA,
    composition: usable.map((c) => ({
      key: c.key,
      weight: Number((c.confidence * c.evidenceCount).toFixed(3)),
      score: c.score,
    })),
  };
}

export function attentionSignals(input: {
  incompleteActivities: number;
  inactiveDays: number | null;
}): AttentionSignal[] {
  const out: AttentionSignal[] = [];
  if (input.incompleteActivities >= 3 && (input.inactiveDays ?? 0) >= 10) {
    out.push({
      code: 'inactive_with_pending',
      evidence: `${input.incompleteActivities} atividades não concluídas e nenhuma atividade acadêmica nos últimos ${input.inactiveDays} dias.`,
    });
  } else if ((input.inactiveDays ?? 0) >= 10) {
    out.push({
      code: 'inactive',
      evidence: `Nenhuma atividade acadêmica nos últimos ${input.inactiveDays} dias.`,
    });
  }
  return out;
}

export function humanizeResult(input: {
  strengths: string[];
  developments: string[];
  goal: string | null;
}): { summary: string; nextAction: string } {
  const strength = input.strengths[0] || 'experiência prática inicial';
  const gap = input.developments[0] || 'fundamentos técnicos';
  const goal = input.goal ? ` Seu objetivo declarado (${input.goal}) orienta o próximo passo.` : '';
  return {
    summary: `Você demonstrou boa base em ${strength}. Neste momento, ${gap} aparece como uma oportunidade importante de desenvolvimento.${goal}`,
    nextAction: `Comece pelo conteúdo recomendado de ${gap} e depois retome a trilha do curso.`,
  };
}

export function tutorAllowedContextKeys(): string[] {
  return [
    'school',
    'course',
    'lesson',
    'progress',
    'competenceGaps',
    'goals',
    'explanationPreference',
    'priorEvidenceSummary',
  ];
}
