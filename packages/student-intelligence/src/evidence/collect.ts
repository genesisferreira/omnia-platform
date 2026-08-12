import type { EvidenceRecord, SipEvidenceInput } from '../domain/types';
import { detectCompetencyFromText } from './detect';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Evidence Engine — materializa evidências a partir de sinais LMS/Tutor/Feedback.
 * Nunca gera evidência sem origem rastreável.
 */
export function collectEvidenceFromSignals(input: {
  userKey: string;
  courseId: string | null;
  signals: SipEvidenceInput;
  now?: string;
}): EvidenceRecord[] {
  const now = input.now || new Date().toISOString();
  const out: EvidenceRecord[] = [];
  const s = input.signals;

  out.push({
    sourceType: 'lms',
    sourceId: input.courseId,
    competencyKey: null,
    strength: clamp01(s.progressPercent / 100),
    summary: `Progresso LMS ${Math.round(s.progressPercent)}% · ${s.completedLessonIds.length} aulas`,
    payload: {
      completedLessonIds: s.completedLessonIds.slice(0, 20),
      completedModuleIds: s.completedModuleIds.slice(0, 20),
    },
    at: now,
    confidence: s.completedLessonIds.length >= 2 ? 0.75 : 0.35,
  });

  if (s.studyTimeMinutes > 0) {
    out.push({
      sourceType: 'study_time',
      sourceId: input.courseId,
      competencyKey: null,
      strength: clamp01(s.studyTimeMinutes / 120),
      summary: `Tempo de estudo acumulado: ${Math.round(s.studyTimeMinutes)} min`,
      at: now,
      confidence: s.studyTimeMinutes >= 15 ? 0.7 : 0.4,
    });
  }

  for (const topic of s.masteredTopics.slice(0, 12)) {
    out.push({
      sourceType: 'tutor',
      sourceId: null,
      competencyKey: detectCompetencyFromText(topic),
      strength: 0.75,
      summary: `Tópico dominado: ${topic}`,
      payload: { topic },
      at: now,
      confidence: 0.65,
    });
  }

  for (const topic of s.difficultyTopics.slice(0, 12)) {
    out.push({
      sourceType: 'tutor',
      sourceId: null,
      competencyKey: detectCompetencyFromText(topic),
      strength: 0.25,
      summary: `Dificuldade observada: ${topic}`,
      payload: { topic, difficulty: true },
      at: now,
      confidence: 0.6,
    });
  }

  for (const q of s.recentQuestions.slice(0, 20)) {
    out.push({
      sourceType: 'question',
      sourceId: null,
      competencyKey: detectCompetencyFromText(q.question),
      strength: clamp01(q.groundingScore || (q.status === 'ok' ? 0.55 : 0.2)),
      summary: `Pergunta: ${q.question.slice(0, 120)}`,
      payload: { status: q.status, groundingScore: q.groundingScore },
      at: now,
      confidence: clamp01(0.4 + (q.groundingScore || 0) * 0.4),
    });
  }

  if (s.aiUsageCount > 0) {
    out.push({
      sourceType: 'tutor',
      sourceId: input.courseId,
      competencyKey: null,
      strength: clamp01(0.3 + Math.min(s.aiUsageCount, 30) / 40),
      summary: `Uso do Tutor IA: ${s.aiUsageCount} interações · grounding médio ${s.avgGrounding.toFixed(2)}`,
      payload: { aiUsageCount: s.aiUsageCount, avgGrounding: s.avgGrounding },
      at: now,
      confidence: s.aiUsageCount >= 3 ? 0.7 : 0.4,
    });
  }

  if (s.negativeFeedbackCount > 0) {
    out.push({
      sourceType: 'feedback',
      sourceId: input.courseId,
      competencyKey: null,
      strength: clamp01(1 - Math.min(s.negativeFeedbackCount, 10) / 10),
      summary: `Feedback negativo acumulado: ${s.negativeFeedbackCount}`,
      at: now,
      confidence: 0.55,
    });
  }

  return out;
}
