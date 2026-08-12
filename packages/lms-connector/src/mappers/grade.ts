import type { LmsGrade } from '@omnia/shared/lms';

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

type GradeItemRaw = {
  id?: unknown;
  cmid?: unknown;
  itemname?: unknown;
  gradeformatted?: unknown;
  graderaw?: unknown;
  grademax?: unknown;
  percentageformatted?: unknown;
};

/**
 * gradereport_user_get_grade_items
 * shape: { usergrades: [{ courseid, userid, gradeitems: [...] }] }
 */
export function mapMoodleGrades(
  raw: unknown,
  fallbackCourseId?: number,
  fallbackUserId?: number,
): LmsGrade[] {
  const usergrades =
    raw && typeof raw === 'object' && 'usergrades' in raw
      ? (raw as { usergrades: unknown }).usergrades
      : Array.isArray(raw)
        ? raw
        : [];

  if (!Array.isArray(usergrades)) return [];

  const out: LmsGrade[] = [];
  for (const ug of usergrades) {
    if (!ug || typeof ug !== 'object') continue;
    const row = ug as {
      courseid?: unknown;
      userid?: unknown;
      gradeitems?: unknown;
    };
    const moodleCourseId = asNumber(row.courseid) ?? fallbackCourseId ?? 0;
    const moodleUserId = asNumber(row.userid) ?? fallbackUserId ?? 0;
    const items = Array.isArray(row.gradeitems) ? row.gradeitems : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const g = item as GradeItemRaw;
      const itemName = asString(g.itemname);
      if (!itemName) continue;
      const pctRaw = asString(g.percentageformatted)?.replace('%', '').trim();
      out.push({
        moodleCourseId,
        moodleUserId,
        moodleActivityId: asNumber(g.cmid),
        itemName,
        gradeFormatted: asString(g.gradeformatted),
        gradeRaw: asNumber(g.graderaw),
        gradeMax: asNumber(g.grademax),
        percentage: pctRaw ? asNumber(pctRaw) : null,
      });
    }
  }
  return out;
}
