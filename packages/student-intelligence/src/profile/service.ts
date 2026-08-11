import { computeCompetencies } from '../competency/competency-engine';
import { collectEvidenceFromSignals } from '../evidence/collect';
import { computeInsights } from '../insights';
import { inferPreferences, recommendLevel } from '../learning/preferences';
import { buildSipRecommendations, nextStepsFromRecommendations } from '../recommendations';
import type {
  MotivationProfile,
  SipAssistantContext,
  SipDigitalTwin,
  SipRecalculateInput,
  SipRecalculateResult,
} from '../domain/types';

const emptyMotivation = (): MotivationProfile => ({
  goals: [],
  notes: null,
  updatedByStudentAt: null,
});

/**
 * Learning Intelligence + Profile orchestration (puro).
 * Persistência fica nos adapters admin — assistentes só consomem ProfileService.
 */
export function recalculateSipTwin(input: SipRecalculateInput): SipRecalculateResult {
  const now = input.now || new Date().toISOString();
  const evidence = collectEvidenceFromSignals({
    userKey: input.userKey,
    courseId: input.courseId,
    signals: input.evidenceInput,
    now,
  });

  if (evidence.length === 0) {
    throw new Error('SIP_NO_EVIDENCE');
  }

  const competencies = computeCompetencies({
    evidence,
    previous: input.existingCompetencies,
    now,
  });
  const preferences = inferPreferences({ evidence, competencies });
  const recommendedLevel = recommendLevel(competencies);
  const recommendations = buildSipRecommendations({
    competencies,
    preferences,
    signals: input.evidenceInput,
    catalogHints: input.catalogHints,
    courseId: input.courseId,
  });
  const insights = computeInsights({
    competencies,
    evidence,
    signals: input.evidenceInput,
    now,
  });
  const motivation = input.motivation || emptyMotivation();
  const sources = [...new Set(evidence.map((e) => e.sourceType))];

  const twin: SipDigitalTwin = {
    userKey: input.userKey,
    courseId: input.courseId,
    language: input.language || 'pt-BR',
    identification: {
      displayName: input.displayName ?? null,
      technicalLevel: recommendedLevel,
      progressPercent: input.evidenceInput.progressPercent,
      studyTimeMinutes: input.evidenceInput.studyTimeMinutes,
    },
    competencies,
    objectives: motivation,
    learningProfile: {
      preferences,
      recommendedLevel,
    },
    evidenceSummary: {
      count: evidence.length,
      lastEvidenceAt: now,
      sources,
    },
    recommendations,
    insights,
    history: [
      {
        at: now,
        event: 'sip.recalculate',
        origin: 'student-intelligence',
      },
    ],
    version: 1,
    updatedAt: now,
  };

  const audit = {
    userKey: input.userKey,
    courseId: input.courseId,
    origin: 'student-intelligence',
    event: 'sip.recalculate',
    evidenceIds: evidence.map((e, i) => e.id || `ev-${i}`),
    model: 'sip-rules-v1',
    confidence: insights.confidenceIndex,
    at: now,
    payload: {
      competencyCount: competencies.length,
      evidenceCount: evidence.length,
      recommendationCount: recommendations.length,
    },
  };

  return { twin, evidence, audit };
}

/**
 * Profile Service — única interface de leitura para assistentes.
 */
export function toAssistantContext(twin: SipDigitalTwin): SipAssistantContext {
  const top = twin.competencies.slice(0, 3).map((c) => ({
    key: c.key,
    label: c.label,
    score: c.score,
  }));
  const gaps = [...twin.competencies]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((c) => ({ key: c.key, label: c.label, score: c.score }));
  const preferences = twin.learningProfile.preferences
    .filter((p) => p.score >= 0.35)
    .slice(0, 3)
    .map((p) => p.key);
  const nextSteps = nextStepsFromRecommendations(twin.recommendations);
  const summaryText = [
    `## SIP_STUDENT_CONTEXT`,
    `Nível técnico: ${twin.identification.technicalLevel}`,
    `Top competências: ${top.map((c) => `${c.label}(${(c.score * 100).toFixed(0)}%)`).join(', ') || 'n/d'}`,
    `Lacunas: ${gaps.map((c) => `${c.label}(${(c.score * 100).toFixed(0)}%)`).join(', ') || 'n/d'}`,
    `Preferências inferidas: ${preferences.join(', ') || 'n/d'}`,
    `Objetivos: ${twin.objectives.goals.join(', ') || 'não declarados'}`,
    `Próximos passos: ${nextSteps.join('; ') || 'continuar estudo regular'}`,
    'Regra: use este contexto para personalizar; NÃO altere o perfil do aluno; NÃO invente competências.',
  ].join('\n');

  return {
    userKey: twin.userKey,
    technicalLevel: twin.identification.technicalLevel,
    topCompetencies: top,
    gaps,
    preferences,
    goals: twin.objectives.goals,
    nextSteps,
    summaryText,
    confidence: twin.insights.confidenceIndex,
    computedAt: twin.updatedAt,
  };
}

/** Vista portal — sem métricas internas de IA (IMT etc. só no admin). */
export function toPortalView(twin: SipDigitalTwin) {
  return {
    technicalLevel: twin.identification.technicalLevel,
    progressPercent: twin.identification.progressPercent,
    competencies: twin.competencies.map((c) => ({
      label: c.label,
      score: c.score,
      trend: c.trend,
    })),
    objectives: twin.objectives,
    preferences: twin.learningProfile.preferences
      .filter((p) => p.score >= 0.3)
      .slice(0, 3)
      .map((p) => p.key),
    recommendations: twin.recommendations.map((r) => ({
      type: r.type,
      title: r.title,
      reason: r.reason,
    })),
    nextSteps: nextStepsFromRecommendations(twin.recommendations),
    updatedAt: twin.updatedAt,
  };
}
