import type { Endpoint, PayloadRequest } from 'payload';
import { checkRateLimit } from '@omnia/shared/rate-limit';

import { requireLmsAdmin, requireLmsAuth } from '../../services/lms/auth-context';
import { writeLmsAudit } from '../../services/lms/identity';
import {
  recordBusinessRoute,
  withLmsObservability,
} from '../../services/lms/observability';
import {
  assertUserEnrolled,
  buildHealthResponse,
  getCourseById,
  getCourseCompletion,
  getCourseContent,
  getCourseProgress,
  getUserGrades,
  jsonError,
  jsonOk,
  listUserCourses,
  loadAdminPolicyDefaults,
  parseCourseId,
  parsePositiveIntParam,
  resolveLinkedMoodleUser,
} from '../../services/lms/read-api';
import {
  getLmsSessionManager,
  getRuntimeLmsConfig,
  resolveRolePolicy,
} from '../../services/lms/runtime';
import { lmsProvisionEndpoints } from './provision';
import { lmsMediaEndpoints } from './media';

async function applyRateLimit(
  _req: PayloadRequest,
  scope: string,
  subject: string,
): Promise<Response | null> {
  const decision = await checkRateLimit({
    scope: `lms:${scope}`,
    subjects: [{ value: subject }],
    max: 60,
    windowMs: 60_000,
    onRedisUnavailable: 'memory-fallback',
  });
  if (!decision.allowed) {
    return Response.json(
      { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(decision.retryAfterSeconds ?? 60),
        },
      },
    );
  }
  return null;
}

function clientIp(req: PayloadRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || '0.0.0.0';
  return req.headers.get('x-real-ip') || '0.0.0.0';
}

export const lmsHealthEndpoint: Endpoint = {
  path: '/omnia/lms/health',
  method: 'get',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/health', async () => {
      try {
        return await buildHealthResponse(req);
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsMeEndpoint: Endpoint = {
  path: '/omnia/lms/me',
  method: 'get',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/me', async () => {
      try {
        const auth = requireLmsAuth(req);
        const limited = await applyRateLimit(req, 'me', auth.omniaUserId);
        if (limited) return limited;
        const linked = await resolveLinkedMoodleUser(req, auth.omniaUserId);
        if (!linked.linked) return jsonOk({ ok: true, ...linked.body });
        return jsonOk({
          ok: true,
          connected: true,
          identity: linked.link,
          user: linked.user,
        });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsCoursesEndpoint: Endpoint = {
  path: '/omnia/lms/courses',
  method: 'get',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/courses', async () => {
      try {
        const auth = requireLmsAuth(req);
        const limited = await applyRateLimit(req, 'courses', auth.omniaUserId);
        if (limited) return limited;
        const linked = await resolveLinkedMoodleUser(req, auth.omniaUserId);
        if (!linked.linked) return jsonOk({ ok: true, ...linked.body });

        const url = new URL(req.url || 'http://local', 'http://local');
        const page = parsePositiveIntParam(url.searchParams.get('page') ?? undefined, 1, 100);
        const pageSize = parsePositiveIntParam(url.searchParams.get('pageSize') ?? undefined, 20, 50);
        const enrollments = await listUserCourses(linked.user.moodleUserId);
        const start = (page - 1) * pageSize;
        const slice = enrollments.slice(start, start + pageSize);
        return jsonOk({
          ok: true,
          connected: true,
          page,
          pageSize,
          total: enrollments.length,
          items: slice.map((e) => ({
            moodleCourseId: e.moodleCourseId,
            enrolledAt: e.enrolledAt,
            course: e.course
              ? {
                  moodleCourseId: e.course.moodleCourseId,
                  shortName: e.course.shortName,
                  fullName: e.course.fullName,
                  displayName: e.course.displayName,
                  summary: e.course.summary,
                  categoryId: e.course.categoryId,
                  startDate: e.course.startDate,
                  endDate: e.course.endDate,
                  visible: e.course.visible,
                  format: e.course.format,
                }
              : null,
          })),
        });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsCourseByIdEndpoint: Endpoint = {
  path: '/omnia/lms/courses/:courseId',
  method: 'get',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/courses/:courseId', async () => {
      try {
        const auth = requireLmsAuth(req);
        const limited = await applyRateLimit(req, 'course', auth.omniaUserId);
        if (limited) return limited;
        const courseId = parseCourseId(req.routeParams?.courseId as string | undefined);
        if (!courseId) {
          return jsonOk(
            { ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid courseId' } },
            400,
          );
        }
        const linked = await resolveLinkedMoodleUser(req, auth.omniaUserId);
        if (!linked.linked) return jsonOk({ ok: true, ...linked.body });
        if (!(await assertUserEnrolled(linked.user.moodleUserId, courseId))) {
          return jsonOk(
            { ok: false, error: { code: 'FORBIDDEN', message: 'Not enrolled in course' } },
            403,
          );
        }
        const course = await getCourseById(courseId);
        if (!course) {
          return jsonOk(
            { ok: false, error: { code: 'MOODLE_NOT_FOUND', message: 'Course not found' } },
            404,
          );
        }
        recordBusinessRoute('courses_by_id');
        return jsonOk({ ok: true, connected: true, course });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsCourseContentEndpoint: Endpoint = {
  path: '/omnia/lms/courses/:courseId/content',
  method: 'get',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/courses/:courseId/content', async () => {
      try {
        const auth = requireLmsAuth(req);
        const limited = await applyRateLimit(req, 'content', auth.omniaUserId);
        if (limited) return limited;
        const courseId = parseCourseId(req.routeParams?.courseId as string | undefined);
        if (!courseId) {
          return jsonOk(
            { ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid courseId' } },
            400,
          );
        }
        const linked = await resolveLinkedMoodleUser(req, auth.omniaUserId);
        if (!linked.linked) return jsonOk({ ok: true, ...linked.body });
        if (!(await assertUserEnrolled(linked.user.moodleUserId, courseId))) {
          return jsonOk(
            { ok: false, error: { code: 'FORBIDDEN', message: 'Not enrolled in course' } },
            403,
          );
        }
        const sections = await getCourseContent(courseId);
        recordBusinessRoute('course_content');
        return jsonOk({ ok: true, connected: true, moodleCourseId: courseId, sections });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsCourseProgressEndpoint: Endpoint = {
  path: '/omnia/lms/courses/:courseId/progress',
  method: 'get',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/courses/:courseId/progress', async () => {
      try {
        const auth = requireLmsAuth(req);
        const limited = await applyRateLimit(req, 'progress', auth.omniaUserId);
        if (limited) return limited;
        const courseId = parseCourseId(req.routeParams?.courseId as string | undefined);
        if (!courseId) {
          return jsonOk(
            { ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid courseId' } },
            400,
          );
        }
        const linked = await resolveLinkedMoodleUser(req, auth.omniaUserId);
        if (!linked.linked) return jsonOk({ ok: true, ...linked.body });
        if (!(await assertUserEnrolled(linked.user.moodleUserId, courseId))) {
          return jsonOk(
            { ok: false, error: { code: 'FORBIDDEN', message: 'Not enrolled in course' } },
            403,
          );
        }
        const progress = await getCourseProgress(courseId, linked.user.moodleUserId);
        recordBusinessRoute('progress');
        return jsonOk({ ok: true, connected: true, progress });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsGradesEndpoint: Endpoint = {
  path: '/omnia/lms/grades',
  method: 'get',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/grades', async () => {
      try {
        const auth = requireLmsAuth(req);
        const limited = await applyRateLimit(req, 'grades', auth.omniaUserId);
        if (limited) return limited;
        const linked = await resolveLinkedMoodleUser(req, auth.omniaUserId);
        if (!linked.linked) return jsonOk({ ok: true, ...linked.body });
        const url = new URL(req.url || 'http://local', 'http://local');
        const courseId = parseCourseId(url.searchParams.get('courseId') ?? undefined);
        if (courseId && !(await assertUserEnrolled(linked.user.moodleUserId, courseId))) {
          return jsonOk(
            { ok: false, error: { code: 'FORBIDDEN', message: 'Not enrolled in course' } },
            403,
          );
        }
        const grades = await getUserGrades(linked.user.moodleUserId, courseId ?? undefined);
        recordBusinessRoute('grades');
        return jsonOk({ ok: true, connected: true, grades });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsCompletionEndpoint: Endpoint = {
  path: '/omnia/lms/completion',
  method: 'get',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/completion', async () => {
      try {
        const auth = requireLmsAuth(req);
        const limited = await applyRateLimit(req, 'completion', auth.omniaUserId);
        if (limited) return limited;
        const linked = await resolveLinkedMoodleUser(req, auth.omniaUserId);
        if (!linked.linked) return jsonOk({ ok: true, ...linked.body });
        const url = new URL(req.url || 'http://local', 'http://local');
        const courseId = parseCourseId(url.searchParams.get('courseId') ?? undefined);
        if (!courseId) {
          return jsonOk(
            { ok: false, error: { code: 'BAD_REQUEST', message: 'courseId is required' } },
            400,
          );
        }
        if (!(await assertUserEnrolled(linked.user.moodleUserId, courseId))) {
          return jsonOk(
            { ok: false, error: { code: 'FORBIDDEN', message: 'Not enrolled in course' } },
            403,
          );
        }
        const completion = await getCourseCompletion(courseId, linked.user.moodleUserId);
        recordBusinessRoute('completion', { completed: !!completion.completed });
        return jsonOk({ ok: true, connected: true, completion });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsSessionsCreateEndpoint: Endpoint = {
  path: '/omnia/lms/sessions',
  method: 'post',
  handler: async (req) =>
    withLmsObservability(
      req,
      '/omnia/lms/sessions',
      async () => {
        try {
          const auth = requireLmsAuth(req);
          const limited = await applyRateLimit(req, 'sessions-create', auth.omniaUserId);
          if (limited) return limited;
          const body = (await req.json?.()) as {
            deviceId?: string;
            sessionFamilyId?: string;
          } | null;
          const config = getRuntimeLmsConfig();
          const admin = await loadAdminPolicyDefaults(req);
          const policy = resolveRolePolicy(auth.role, config, admin);
          const sessions = await getLmsSessionManager();
          const result = await sessions.createSession({
            userId: auth.omniaUserId,
            role: auth.role,
            deviceId: body?.deviceId || 'unknown',
            sessionFamilyId: body?.sessionFamilyId,
            userAgent: req.headers.get('user-agent') || undefined,
            ip: clientIp(req),
            policy,
          });
          if (result.revokedSessionIds.length > 0) {
            await writeLmsAudit(req, {
              action: 'lms.session.limit_revoke',
              actorId: auth.omniaUserId,
              targetUserId: auth.omniaUserId,
              newValue: {
                sessionId: result.session.sessionId,
                revokedSessionIds: result.revokedSessionIds,
              },
            });
          }
          return jsonOk({
            ok: true,
            session: {
              sessionId: result.session.sessionId,
              sessionFamilyId: result.session.sessionFamilyId,
              expiresAt: result.session.expiresAt,
              role: result.session.role,
            },
            revokedSessionIds: result.revokedSessionIds,
          });
        } catch (err) {
          return jsonError(err);
        }
      },
      'POST',
    ),
};

export const lmsSessionsHeartbeatEndpoint: Endpoint = {
  path: '/omnia/lms/sessions/heartbeat',
  method: 'post',
  handler: async (req) =>
    withLmsObservability(
      req,
      '/omnia/lms/sessions/heartbeat',
      async () => {
        try {
          const auth = requireLmsAuth(req);
          const body = (await req.json?.()) as { sessionId?: string } | null;
          if (!body?.sessionId) {
            return jsonOk(
              { ok: false, error: { code: 'BAD_REQUEST', message: 'sessionId is required' } },
              400,
            );
          }
          const sessions = await getLmsSessionManager();
          const session = await sessions.heartbeat(body.sessionId, auth.omniaUserId);
          return jsonOk({
            ok: true,
            sessionId: session.sessionId,
            lastSeenAt: session.lastSeenAt,
            expiresAt: session.expiresAt,
          });
        } catch (err) {
          return jsonError(err);
        }
      },
      'POST',
    ),
};

export const lmsSessionsLogoutEndpoint: Endpoint = {
  path: '/omnia/lms/sessions/logout',
  method: 'post',
  handler: async (req) =>
    withLmsObservability(
      req,
      '/omnia/lms/sessions/logout',
      async () => {
        try {
          const auth = requireLmsAuth(req);
          const body = (await req.json?.()) as { sessionId?: string } | null;
          if (!body?.sessionId) {
            return jsonOk(
              { ok: false, error: { code: 'BAD_REQUEST', message: 'sessionId is required' } },
              400,
            );
          }
          const sessions = await getLmsSessionManager();
          await sessions.logout(body.sessionId, auth.omniaUserId);
          await writeLmsAudit(req, {
            action: 'lms.session.logout',
            actorId: auth.omniaUserId,
            targetUserId: auth.omniaUserId,
            newValue: { sessionId: body.sessionId },
          });
          return jsonOk({ ok: true });
        } catch (err) {
          return jsonError(err);
        }
      },
      'POST',
    ),
};

export const lmsSessionsListEndpoint: Endpoint = {
  path: '/omnia/lms/sessions',
  method: 'get',
  handler: async (req) =>
    withLmsObservability(req, '/omnia/lms/sessions', async () => {
      try {
        const auth = requireLmsAdmin(req);
        const url = new URL(req.url || 'http://local', 'http://local');
        const userId = url.searchParams.get('userId')?.trim() || auth.omniaUserId;
        const sessions = await getLmsSessionManager();
        const active = await sessions.listActiveSessions(userId);
        return jsonOk({
          ok: true,
          userId,
          sessions: active.map((s) => ({
            sessionId: s.sessionId,
            sessionFamilyId: s.sessionFamilyId,
            role: s.role,
            deviceId: s.deviceId,
            userAgent: s.userAgent,
            ip: s.ip,
            createdAt: s.createdAt,
            lastSeenAt: s.lastSeenAt,
            expiresAt: s.expiresAt,
          })),
        });
      } catch (err) {
        return jsonError(err);
      }
    }),
};

export const lmsSessionsRevokeEndpoint: Endpoint = {
  path: '/omnia/lms/sessions/:sessionId/revoke',
  method: 'post',
  handler: async (req) =>
    withLmsObservability(
      req,
      '/omnia/lms/sessions/:sessionId/revoke',
      async () => {
        try {
          const auth = requireLmsAdmin(req);
          const sessionId = req.routeParams?.sessionId as string | undefined;
          if (!sessionId) {
            return jsonOk(
              { ok: false, error: { code: 'BAD_REQUEST', message: 'sessionId is required' } },
              400,
            );
          }
          const body = (await req.json?.().catch(() => null)) as { reason?: string } | null;
          const sessions = await getLmsSessionManager();
          const revoked = await sessions.revokeSession(sessionId, body?.reason || 'ADMIN_REVOKE');
          await writeLmsAudit(req, {
            action: 'lms.session.revoke',
            actorId: auth.omniaUserId,
            targetUserId: revoked?.userId,
            newValue: { sessionId, reason: body?.reason || 'ADMIN_REVOKE' },
          });
          return jsonOk({ ok: true, revoked: !!revoked });
        } catch (err) {
          return jsonError(err);
        }
      },
      'POST',
    ),
};

export const lmsSessionsRevokeAllEndpoint: Endpoint = {
  path: '/omnia/lms/sessions/revoke-all',
  method: 'post',
  handler: async (req) =>
    withLmsObservability(
      req,
      '/omnia/lms/sessions/revoke-all',
      async () => {
        try {
          const auth = requireLmsAdmin(req);
          const body = (await req.json?.()) as { userId?: string; reason?: string } | null;
          const userId = body?.userId?.trim();
          if (!userId) {
            return jsonOk(
              { ok: false, error: { code: 'BAD_REQUEST', message: 'userId is required' } },
              400,
            );
          }
          const sessions = await getLmsSessionManager();
          const count = await sessions.revokeAllForUser(userId, body?.reason || 'ADMIN_REVOKE_ALL');
          await writeLmsAudit(req, {
            action: 'lms.session.revoke_all',
            actorId: auth.omniaUserId,
            targetUserId: userId,
            newValue: { count, reason: body?.reason || 'ADMIN_REVOKE_ALL' },
          });
          return jsonOk({ ok: true, revokedCount: count });
        } catch (err) {
          return jsonError(err);
        }
      },
      'POST',
    ),
};

export const lmsEndpoints: Endpoint[] = [
  lmsHealthEndpoint,
  lmsMeEndpoint,
  lmsCoursesEndpoint,
  lmsCourseByIdEndpoint,
  lmsCourseContentEndpoint,
  lmsCourseProgressEndpoint,
  lmsGradesEndpoint,
  lmsCompletionEndpoint,
  lmsSessionsCreateEndpoint,
  lmsSessionsHeartbeatEndpoint,
  lmsSessionsLogoutEndpoint,
  lmsSessionsListEndpoint,
  lmsSessionsRevokeEndpoint,
  lmsSessionsRevokeAllEndpoint,
  ...lmsProvisionEndpoints,
  ...lmsMediaEndpoints,
];
