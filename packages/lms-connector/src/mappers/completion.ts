import type { LmsCompletion } from '@omnia/shared/lms';

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function asBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return false;
}

function unixToIso(value: unknown): string | null {
  const n = asNumber(value);
  if (n == null || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

/**
 * core_completion_get_course_completion_status
 * shape: { completionstatus: { completed, timecompleted, aggregation, ... } }
 */
export function mapMoodleCompletion(
  raw: unknown,
  moodleCourseId: number,
  moodleUserId: number,
): LmsCompletion {
  const status =
    raw && typeof raw === 'object' && 'completionstatus' in raw
      ? (raw as { completionstatus: Record<string, unknown> }).completionstatus
      : raw && typeof raw === 'object'
        ? (raw as Record<string, unknown>)
        : {};

  return {
    moodleCourseId,
    moodleUserId,
    completed: asBool(status.completed),
    timeCompleted: unixToIso(status.timecompleted),
    aggregation:
      typeof status.aggregation === 'string'
        ? status.aggregation
        : status.aggregation != null
          ? String(status.aggregation)
          : null,
  };
}
