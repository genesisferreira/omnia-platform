import type { ContinuePointer } from '../types';

export type ResolveContinueInput = {
  courses: Array<{ moodleCourseId: number }>;
  continuePointer?: ContinuePointer | null;
  progressByCourse?: Record<number, { incompleteActivityId?: number | null }>;
};

export type ContinueTarget = {
  courseId: number;
  activityId?: number | null;
  source: NonNullable<ContinuePointer['source']>;
};

/**
 * Resolve o alvo de Continuar estudando (Business Rules CL-*).
 * Não lê storage — recebe o pointer já hidratado pelo Engine.
 */
export function resolveContinueTarget(input: ResolveContinueInput): ContinueTarget | null {
  const last = input.continuePointer ?? null;
  if (last && input.courses.some((c) => c.moodleCourseId === last.courseId)) {
    return {
      courseId: last.courseId,
      activityId: last.activityId,
      source: last.source ?? 'last_seen',
    };
  }

  for (const course of input.courses) {
    const progress = input.progressByCourse?.[course.moodleCourseId];
    if (progress?.incompleteActivityId) {
      return {
        courseId: course.moodleCourseId,
        activityId: progress.incompleteActivityId,
        source: 'progress',
      };
    }
  }

  const first = input.courses[0];
  if (!first) return null;
  return { courseId: first.moodleCourseId, activityId: null, source: 'enrollment' };
}
