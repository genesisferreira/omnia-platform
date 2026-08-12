import type { LmsProgress } from '@omnia/shared/lms';

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function unixToIso(value: unknown): string | null {
  const n = asNumber(value);
  if (n == null || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

/**
 * core_completion_get_activities_completion_status
 * shape: { statuses: [{ cmid, state, timecompleted, ... }] }
 */
export function mapMoodleProgress(
  raw: unknown,
  moodleCourseId: number,
  moodleUserId: number,
): LmsProgress {
  const statuses =
    raw && typeof raw === 'object' && 'statuses' in raw
      ? (raw as { statuses: unknown }).statuses
      : Array.isArray(raw)
        ? raw
        : [];

  const activities = Array.isArray(statuses)
    ? statuses
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const row = item as {
            cmid?: unknown;
            state?: unknown;
            timecompleted?: unknown;
          };
          const moodleActivityId = asNumber(row.cmid);
          if (moodleActivityId == null) return null;
          return {
            moodleActivityId,
            state: asNumber(row.state) ?? 0,
            timeCompleted: unixToIso(row.timecompleted),
          };
        })
        .filter((a): a is NonNullable<typeof a> => a != null)
    : [];

  return { moodleCourseId, moodleUserId, activities };
}
