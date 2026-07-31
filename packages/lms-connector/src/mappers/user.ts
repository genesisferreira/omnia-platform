import type { LmsUser } from '@omnia/shared/lms';

type MoodleUserRaw = {
  id?: unknown;
  username?: unknown;
  fullname?: unknown;
  email?: unknown;
  firstname?: unknown;
  lastname?: unknown;
};

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export function mapMoodleUser(raw: unknown): LmsUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as MoodleUserRaw;
  const moodleUserId = asNumber(u.id);
  if (moodleUserId == null) return null;
  const username = asString(u.username) || '';
  const fullName =
    asString(u.fullname) ||
    [asString(u.firstname), asString(u.lastname)].filter(Boolean).join(' ').trim() ||
    username;
  return {
    moodleUserId,
    username,
    fullName,
    email: asString(u.email),
    firstName: asString(u.firstname),
    lastName: asString(u.lastname),
  };
}

export function mapMoodleUsers(raw: unknown): LmsUser[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapMoodleUser).filter((u): u is LmsUser => u != null);
}
