import type { LmsActivity, LmsCourseSection } from '@omnia/shared/lms';

type ModuleRaw = {
  id?: unknown;
  name?: unknown;
  modname?: unknown;
  instance?: unknown;
  visible?: unknown;
  url?: unknown;
  completion?: unknown;
};

type SectionRaw = {
  id?: unknown;
  name?: unknown;
  summary?: unknown;
  visible?: unknown;
  modules?: unknown;
};

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return fallback;
}

export function mapMoodleActivity(raw: unknown): LmsActivity | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as ModuleRaw;
  const moodleActivityId = asNumber(m.id);
  if (moodleActivityId == null) return null;
  return {
    moodleActivityId,
    name: asString(m.name) || '',
    modName: asString(m.modname) || 'unknown',
    instanceId: asNumber(m.instance),
    visible: asBool(m.visible, true),
    url: asString(m.url),
    completionEnabled: asNumber(m.completion) != null && (asNumber(m.completion) ?? 0) > 0,
  };
}

export function mapMoodleSection(raw: unknown): LmsCourseSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as SectionRaw;
  const sectionId = asNumber(s.id);
  if (sectionId == null) return null;
  const modules = Array.isArray(s.modules) ? s.modules : [];
  return {
    sectionId,
    name: asString(s.name) || '',
    summary: asString(s.summary),
    visible: asBool(s.visible, true),
    activities: modules
      .map(mapMoodleActivity)
      .filter((a): a is LmsActivity => a != null),
  };
}

export function mapMoodleCourseContents(raw: unknown): LmsCourseSection[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapMoodleSection).filter((s): s is LmsCourseSection => s != null);
}
