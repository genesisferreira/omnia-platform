import type { Endpoint, PayloadRequest } from 'payload';

import { isKiStaff } from '../access/knowledge-intelligence';
import { recordAdaptiveOutcome, runAdaptiveDecide } from '../services/adaptive/decide';
import { refreshAdaptiveDashboard } from '../services/adaptive/dashboard';

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function authorize(req: PayloadRequest): { ok: true; userId?: string; role?: string } | Response {
  const secret = process.env.OMNIA_INTERNAL_API_SECRET;
  const key = req.headers.get('x-omnia-internal-key') || req.headers.get('x-omnia-internal-secret');
  if (secret && key && key === secret) {
    return {
      ok: true,
      userId: req.headers.get('x-omnia-user-id') || undefined,
      role: req.headers.get('x-omnia-lms-role') || 'student',
    };
  }
  if (req.user) {
    return {
      ok: true,
      userId: String(req.user.id),
      role: String((req.user as { role?: string }).role || 'student'),
    };
  }
  if (isKiStaff(req.user as { role?: unknown } | null)) {
    return { ok: true, role: 'admin' };
  }
  return { ok: true, role: 'anonymous' };
}

async function readJson(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json?.();
    if (body && typeof body === 'object') return body as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return {};
}

function portalSafe(result: Awaited<ReturnType<typeof runAdaptiveDecide>>) {
  return {
    nextBest: result.nextBest
      ? {
          actionType: result.nextBest.actionType,
          reasonFriendly: result.nextBest.reasonFriendly,
          lessonTitle: result.nextBest.lessonTitle,
          lessonSlug: result.nextBest.lessonSlug,
          lessonId: result.nextBest.lessonId,
          moduleId: result.nextBest.moduleId,
          courseId: result.nextBest.courseId,
          confidence: result.nextBest.confidence,
        }
      : null,
    plan: {
      steps: result.plan.steps.map((s) => ({
        when: s.when,
        actionType: s.action.actionType,
        reasonFriendly: s.action.reasonFriendly,
        lessonTitle: s.action.lessonTitle,
        lessonSlug: s.action.lessonSlug,
        lessonId: s.action.lessonId,
      })),
      computedAt: result.plan.computedAt,
    },
    why: result.nextBest
      ? {
          summary: result.nextBest.reasonFriendly,
          factors: result.nextBest.factors.map((f) => f.key),
        }
      : null,
    decideMs: result.decideMs,
  };
}

export const adaptiveNextEndpoint: Endpoint = {
  path: '/omnia/adaptive/next',
  method: 'get',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;
    const url = new URL(req.url || 'http://local');
    const courseId = url.searchParams.get('courseId') || '';
    const userKey = url.searchParams.get('userKey') || auth.userId || '';
    if (!courseId || !userKey) return json({ ok: false, error: 'courseId and userKey required' }, 400);
    // ACL: student só o próprio userKey
    if ((auth.role || '').toLowerCase() === 'student' && auth.userId && userKey !== auth.userId) {
      return json({ ok: false, error: 'FORBIDDEN' }, 403);
    }
    const result = await runAdaptiveDecide(req.payload, { userKey, courseId });
    return json({ ok: true, data: portalSafe(result) });
  },
};

export const adaptiveDecideEndpoint: Endpoint = {
  path: '/omnia/adaptive/decide',
  method: 'post',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;
    const body = await readJson(req);
    const courseId = body.courseId != null ? String(body.courseId) : '';
    const userKey = (body.userKey != null ? String(body.userKey) : auth.userId) || '';
    if (!courseId || !userKey) return json({ ok: false, error: 'courseId and userKey required' }, 400);
    if ((auth.role || '').toLowerCase() === 'student' && auth.userId && userKey !== auth.userId) {
      return json({ ok: false, error: 'FORBIDDEN' }, 403);
    }
    const result = await runAdaptiveDecide(req.payload, {
      userKey,
      courseId,
      tenantId: body.tenantId != null ? String(body.tenantId) : null,
      assessmentAvailable: Boolean(body.assessmentAvailable),
    });
    const technical = Boolean(body.technical) || (auth.role || '').toLowerCase() === 'admin';
    return json({
      ok: true,
      data: technical
        ? {
            ...portalSafe(result),
            nextBestFull: result.nextBest,
            actions: result.actions,
            policy: result.policy,
            tutorHint: result.tutorHint,
          }
        : portalSafe(result),
    });
  },
};

export const adaptiveOutcomeEndpoint: Endpoint = {
  path: '/omnia/adaptive/outcome',
  method: 'post',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;
    const body = await readJson(req);
    const decisionId = body.decisionId;
    const outcome = String(body.outcome || '');
    if (decisionId == null || !['accepted', 'ignored', 'completed'].includes(outcome)) {
      return json({ ok: false, error: 'decisionId and outcome required' }, 400);
    }
    await recordAdaptiveOutcome(req.payload, {
      decisionId: decisionId as string | number,
      outcome: outcome as 'accepted' | 'ignored' | 'completed',
    });
    return json({ ok: true });
  },
};

export const adaptiveDashboardEndpoint: Endpoint = {
  path: '/omnia/adaptive/dashboard/refresh',
  method: 'post',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;
    if (!isKiStaff(req.user as { role?: unknown } | null)) {
      const secret = process.env.OMNIA_INTERNAL_API_SECRET;
      const key = req.headers.get('x-omnia-internal-key');
      if (!(secret && key && key === secret)) {
        return json({ ok: false, error: 'FORBIDDEN' }, 403);
      }
    }
    await refreshAdaptiveDashboard(req.payload);
    const dash = await req.payload.findGlobal({
      slug: 'adaptive-learning-dashboard',
      overrideAccess: true,
    });
    return json({ ok: true, data: dash });
  },
};

export const adaptiveEndpoints = [
  adaptiveNextEndpoint,
  adaptiveDecideEndpoint,
  adaptiveOutcomeEndpoint,
  adaptiveDashboardEndpoint,
];
