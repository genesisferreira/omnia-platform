export type LmsLastSeen = {
  courseId: number;
  activityId?: number | null;
  sectionId?: number | null;
  updatedAt: string;
};

function storageKey(omniaUserId: string): string {
  return `omnia:lms:last:${omniaUserId}`;
}

export function readLastSeen(omniaUserId: string): LmsLastSeen | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(omniaUserId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LmsLastSeen;
    if (!parsed?.courseId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastSeen(omniaUserId: string, value: LmsLastSeen): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      storageKey(omniaUserId),
      JSON.stringify({ ...value, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function resolveContinueTarget(input: {
  omniaUserId: string;
  courses: Array<{ moodleCourseId: number }>;
  progressByCourse?: Record<number, { incompleteActivityId?: number | null }>;
  /** Override for tests / SSR */
  lastSeen?: LmsLastSeen | null;
}): { courseId: number; activityId?: number | null } | null {
  const last =
    input.lastSeen !== undefined ? input.lastSeen : readLastSeen(input.omniaUserId);
  if (last && input.courses.some((c) => c.moodleCourseId === last.courseId)) {
    return { courseId: last.courseId, activityId: last.activityId };
  }

  for (const course of input.courses) {
    const progress = input.progressByCourse?.[course.moodleCourseId];
    if (progress?.incompleteActivityId) {
      return { courseId: course.moodleCourseId, activityId: progress.incompleteActivityId };
    }
  }

  const first = input.courses[0];
  if (!first) return null;
  return { courseId: first.moodleCourseId, activityId: null };
}

export function computeProgressPercent(
  activities: Array<{ state: number }>,
): number {
  if (!activities.length) return 0;
  const done = activities.filter((a) => a.state === 1 || a.state === 2).length;
  return Math.round((done / activities.length) * 100);
}
