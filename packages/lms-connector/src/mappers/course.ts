import type { LmsCourse, LmsEnrollment } from '@omnia/shared/lms';

type MoodleCourseRaw = {
  id?: unknown;
  shortname?: unknown;
  fullname?: unknown;
  displayname?: unknown;
  summary?: unknown;
  categoryid?: unknown;
  startdate?: unknown;
  enddate?: unknown;
  visible?: unknown;
  format?: unknown;
  enrolledusercount?: unknown;
};

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  return null;
}

function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return fallback;
}

function unixToIso(value: unknown): string | null {
  const n = asNumber(value);
  if (n == null || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

export function mapMoodleCourse(raw: unknown): LmsCourse | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as MoodleCourseRaw;
  const moodleCourseId = asNumber(c.id);
  if (moodleCourseId == null) return null;
  const shortName = asString(c.shortname) || '';
  const fullName = asString(c.fullname) || shortName;
  return {
    moodleCourseId,
    shortName,
    fullName,
    displayName: asString(c.displayname) || fullName,
    summary: asString(c.summary),
    categoryId: asNumber(c.categoryid),
    startDate: unixToIso(c.startdate),
    endDate: unixToIso(c.enddate),
    visible: asBool(c.visible, true),
    format: asString(c.format),
  };
}

export function mapMoodleCourses(raw: unknown): LmsCourse[] {
  if (Array.isArray(raw)) {
    return raw.map(mapMoodleCourse).filter((c): c is LmsCourse => c != null);
  }
  if (raw && typeof raw === 'object' && 'courses' in raw) {
    return mapMoodleCourses((raw as { courses: unknown }).courses);
  }
  return [];
}

export function mapUserCourseEnrollment(
  raw: unknown,
  moodleUserId: number,
): LmsEnrollment | null {
  const course = mapMoodleCourse(raw);
  if (!course) return null;
  const enrolledAt =
    raw && typeof raw === 'object' && 'timestart' in raw
      ? unixToIso((raw as { timestart?: unknown }).timestart)
      : null;
  return {
    moodleCourseId: course.moodleCourseId,
    moodleUserId,
    role: null,
    enrolledAt,
    course,
  };
}

export function mapUserCourseEnrollments(
  raw: unknown,
  moodleUserId: number,
): LmsEnrollment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => mapUserCourseEnrollment(item, moodleUserId))
    .filter((e): e is LmsEnrollment => e != null);
}
