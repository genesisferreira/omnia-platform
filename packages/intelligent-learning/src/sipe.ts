/** SIPE — pipeline de eventos sobre evidências. Não substitui SIP; alimenta o twin. */

export const SIPE_EVENTS = [
  'ONBOARDING_COMPLETED',
  'INITIAL_ASSESSMENT_COMPLETED',
  'LESSON_STARTED',
  'LESSON_COMPLETED',
  'ASSESSMENT_ATTEMPTED',
  'ASSESSMENT_GRADED',
  'MANUAL_FEEDBACK_RECEIVED',
  'TUTOR_HELP_REQUESTED',
  'REINFORCEMENT_COMPLETED',
  'COURSE_COMPLETED',
  'INTERVENTION_CREATED',
  'EXERCISE_COMPLETED',
] as const;
export type SipeEventType = (typeof SIPE_EVENTS)[number];

export type CompetencySnapshot = {
  key: string;
  score: number;
  confidence: number;
  evidenceCount: number;
  updatedAt: string;
};

export type SipeEvent = {
  type: SipeEventType;
  at: string;
  studentId: number;
  schoolKey: string | null;
  courseId?: number | null;
  competencyKey?: string | null;
  strength?: number;
  score?: number | null;
  sourceId?: string | null;
};

export function applySipeEvent(
  history: CompetencySnapshot[],
  event: SipeEvent,
): { next: CompetencySnapshot[]; changed: CompetencySnapshot | null } {
  const key = event.competencyKey;
  if (!key) return { next: history, changed: null };
  const prev = history.find((h) => h.key === key);
  const delta = eventStrength(event);
  const evidenceCount = (prev?.evidenceCount ?? 0) + 1;
  const blended = prev
    ? Math.round(prev.score * 0.7 + clamp(delta, 0, 100) * 0.3)
    : clamp(delta, 0, 100);
  const confidence = Math.min(1, evidenceCount / 6);
  const changed: CompetencySnapshot = {
    key,
    score: blended,
    confidence: Number(confidence.toFixed(3)),
    evidenceCount,
    updatedAt: event.at,
  };
  return {
    next: [...history.filter((h) => h.key !== key), changed],
    changed,
  };
}

export function eventStrength(event: SipeEvent): number {
  if (typeof event.score === 'number' && Number.isFinite(event.score)) {
    return clamp(event.score, 0, 100);
  }
  if (typeof event.strength === 'number') return clamp(event.strength * 100, 0, 100);
  switch (event.type) {
    case 'LESSON_COMPLETED':
      return 62;
    case 'REINFORCEMENT_COMPLETED':
    case 'EXERCISE_COMPLETED':
      return 58;
    case 'ASSESSMENT_GRADED':
      return 70;
    case 'INITIAL_ASSESSMENT_COMPLETED':
      return 65;
    case 'COURSE_COMPLETED':
      return 80;
    default:
      return 50;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}
