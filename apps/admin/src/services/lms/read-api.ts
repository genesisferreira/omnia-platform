import {
  DEFAULT_LMS_CACHE_TTL,
  LmsConnectorError,
  MOODLE_READ_FUNCTIONS,
  mapMoodleCompletion,
  mapMoodleCourseContents,
  mapMoodleCourses,
  mapMoodleGrades,
  mapMoodleProgress,
  mapMoodleUser,
  mapMoodleUsers,
  mapUserCourseEnrollments,
  checkConnectorHealth,
} from '@omnia/lms-connector';
import type { PayloadRequest } from 'payload';

import { findIdentityLink, notLinkedBody } from './identity';
import {
  getLmsCache,
  getLmsSessionManager,
  getMoodleClient,
  getRuntimeLmsConfig,
  mergePolicyDefaults,
  type AdminLmsPolicyDefaults,
} from './runtime';

export function jsonOk(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export function jsonError(err: unknown): Response {
  if (err instanceof LmsConnectorError) {
    return Response.json(err.toPublicJson(), {
      status: err.httpStatus,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  if (err instanceof Error) {
    if (err.message === 'UNAUTHORIZED') {
      return Response.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (err.message === 'FORBIDDEN') {
      return Response.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }
  return Response.json(
    { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

export function parsePositiveIntParam(
  value: string | undefined,
  fallback: number,
  max: number,
): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(max, n);
}

export function parseCourseId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function loadAdminPolicyDefaults(
  req: PayloadRequest,
): Promise<AdminLmsPolicyDefaults | null> {
  try {
    const doc = await req.payload.findGlobal({
      slug: 'lms-settings',
      depth: 0,
      overrideAccess: true,
    });
    if (!doc) return null;
    return {
      studentSessions: doc.defaultStudentSessions as number | null,
      teacherSessions: doc.defaultTeacherSessions as number | null,
      managerSessions: doc.defaultManagerSessions as number | null,
      adminSessions: doc.defaultAdminSessions as number | null,
      sessionTtlSeconds: doc.sessionTtlSeconds as number | null,
      sessionHeartbeatSeconds: doc.sessionHeartbeatSeconds as number | null,
      revokeOldestOnExceed: doc.revokeOldestOnExceed as boolean | null,
      downloadsAllowed: doc.downloadsAllowedDefault as boolean | null,
      watermarkEnabled: doc.watermarkEnabledDefault as boolean | null,
      mediaTtlSeconds: doc.mediaTtlSecondsDefault as number | null,
      sessionPolicyEnabled: doc.sessionPolicyEnabled as boolean | null,
      connectorEnabled: doc.connectorEnabled as boolean | null,
      connectorReadOnly: doc.connectorReadOnly as boolean | null,
    };
  } catch {
    return null;
  }
}

export async function buildHealthResponse(req: PayloadRequest): Promise<Response> {
  const config = getRuntimeLmsConfig();
  const admin = await loadAdminPolicyDefaults(req);
  const effectiveEnabled = config.connectorEnabled && (admin?.connectorEnabled !== false);
  const client = effectiveEnabled ? await getMoodleClient() : null;
  const sessions = await getLmsSessionManager();
  const cache = await getLmsCache();
  const health = await checkConnectorHealth({
    config: {
      ...config,
      connectorEnabled: effectiveEnabled,
      connectorReadOnly: admin?.connectorReadOnly ?? config.connectorReadOnly,
    },
    client,
    sessions,
    cache,
  });
  return jsonOk({ ok: true, ...health });
}

export async function resolveLinkedMoodleUser(req: PayloadRequest, omniaUserId: string) {
  const link = await findIdentityLink(req.payload, omniaUserId);
  if (!link) {
    return { linked: false as const, body: notLinkedBody() };
  }
  const client = await getMoodleClient();
  const users = await client.call(MOODLE_READ_FUNCTIONS.getUsersByField, {
    field: 'id',
    values: [link.moodleUserId],
  });
  const mapped = mapMoodleUsers(users);
  const user = mapped[0] ?? mapMoodleUser({ id: link.moodleUserId, username: link.moodleUsername });
  if (!user) {
    return { linked: false as const, body: notLinkedBody() };
  }
  return { linked: true as const, link, user };
}

export async function listUserCourses(moodleUserId: number) {
  const client = await getMoodleClient();
  const cache = await getLmsCache();
  const key = cache.key(['user-courses', String(moodleUserId)]);
  const cached = await cache.getJson<unknown>(key);
  if (cached) {
    return mapUserCourseEnrollments(cached, moodleUserId);
  }
  const raw = await client.call(MOODLE_READ_FUNCTIONS.getUserCourses, {
    userid: moodleUserId,
  });
  await cache.setJson(key, raw, DEFAULT_LMS_CACHE_TTL.coursesCatalogSeconds);
  return mapUserCourseEnrollments(raw, moodleUserId);
}

export async function getCourseById(courseId: number) {
  const client = await getMoodleClient();
  const cache = await getLmsCache();
  const key = cache.key(['course', String(courseId)]);
  const cached = await cache.getJson<unknown>(key);
  if (cached) {
    return mapMoodleCourses(cached)[0] ?? null;
  }
  const raw = await client.call(MOODLE_READ_FUNCTIONS.getCoursesByField, {
    field: 'id',
    value: courseId,
  });
  await cache.setJson(key, raw, DEFAULT_LMS_CACHE_TTL.coursesCatalogSeconds);
  return mapMoodleCourses(raw)[0] ?? null;
}

export async function getCourseContent(courseId: number) {
  const client = await getMoodleClient();
  const cache = await getLmsCache();
  const key = cache.key(['course-content', String(courseId)]);
  const cached = await cache.getJson<unknown>(key);
  if (cached) {
    return mapMoodleCourseContents(cached);
  }
  const raw = await client.call(MOODLE_READ_FUNCTIONS.getCourseContents, {
    courseid: courseId,
  });
  await cache.setJson(key, raw, DEFAULT_LMS_CACHE_TTL.courseContentsSeconds);
  return mapMoodleCourseContents(raw);
}

export async function getCourseProgress(courseId: number, moodleUserId: number) {
  const client = await getMoodleClient();
  const raw = await client.call(MOODLE_READ_FUNCTIONS.getActivitiesCompletion, {
    courseid: courseId,
    userid: moodleUserId,
  });
  return mapMoodleProgress(raw, courseId, moodleUserId);
}

export async function getCourseCompletion(courseId: number, moodleUserId: number) {
  const client = await getMoodleClient();
  const raw = await client.call(MOODLE_READ_FUNCTIONS.getCourseCompletion, {
    courseid: courseId,
    userid: moodleUserId,
  });
  return mapMoodleCompletion(raw, courseId, moodleUserId);
}

export async function getUserGrades(moodleUserId: number, courseId?: number) {
  const client = await getMoodleClient();
  const params: Record<string, unknown> = {
    courseid: courseId ?? 0,
    userid: moodleUserId,
  };
  // Moodle exige courseid > 0 tipicamente; se omitido, agregamos por matrículas.
  if (!courseId) {
    const enrollments = await listUserCourses(moodleUserId);
    const all = [];
    for (const e of enrollments.slice(0, 20)) {
      const raw = await client.call(MOODLE_READ_FUNCTIONS.getGradeItems, {
        courseid: e.moodleCourseId,
        userid: moodleUserId,
      });
      all.push(...mapMoodleGrades(raw, e.moodleCourseId, moodleUserId));
    }
    return all;
  }
  const raw = await client.call(MOODLE_READ_FUNCTIONS.getGradeItems, params);
  return mapMoodleGrades(raw, courseId, moodleUserId);
}

export async function assertUserEnrolled(moodleUserId: number, courseId: number): Promise<boolean> {
  const enrollments = await listUserCourses(moodleUserId);
  return enrollments.some((e) => e.moodleCourseId === courseId);
}

export { mergePolicyDefaults, getRuntimeLmsConfig };
