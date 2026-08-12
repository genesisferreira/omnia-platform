import type { Endpoint, PayloadRequest } from 'payload';

import {
  bindRequestScope,
  forbidden,
  isAuthResponse,
  requireNeurofrigoAuth,
  requireNeurofrigoServiceOrStaff,
  resolveSessionScope,
  resolveSubjectUserKey,
} from '../services/neurofrigo/auth-context';
import { recordAdaptiveOutcome, runAdaptiveDecide } from '../services/adaptive/decide';
import { refreshAdaptiveDashboard } from '../services/adaptive/dashboard';

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
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
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;
    const url = new URL(req.url || 'http://local');
    const courseId = url.searchParams.get('courseId') || '';
    if (!courseId) return json({ ok: false, error: 'courseId and userKey required' }, 400);

    const subject = resolveSubjectUserKey(auth, url.searchParams.get('userKey'));
    if (isAuthResponse(subject)) return subject;

    const result = await runAdaptiveDecide(req.payload, {
      userKey: subject.userKey,
      courseId,
    });
    return json({ ok: true, data: portalSafe(result) });
  },
};

export const adaptiveDecideEndpoint: Endpoint = {
  path: '/omnia/adaptive/decide',
  method: 'post',
  handler: async (req) => {
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;
    const body = await readJson(req);
    const courseId = body.courseId != null ? String(body.courseId) : '';
    if (!courseId) return json({ ok: false, error: 'courseId and userKey required' }, 400);

    const subject = resolveSubjectUserKey(auth, body.userKey != null ? String(body.userKey) : null);
    if (isAuthResponse(subject)) return subject;

    const session = await resolveSessionScope(req, auth);
    const scope = bindRequestScope({
      isStaff: auth.isStaff,
      sessionTenantId: session.tenantId,
      sessionCompanyIds: session.companyIds,
      requestedTenantId: body.tenantId != null ? String(body.tenantId) : null,
    });

    const result = await runAdaptiveDecide(req.payload, {
      userKey: subject.userKey,
      courseId,
      tenantId: scope.tenantId,
      assessmentAvailable: Boolean(body.assessmentAvailable),
    });
    const technical = Boolean(body.technical) && auth.isStaff;
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
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;
    const body = await readJson(req);
    const decisionId = body.decisionId;
    const outcome = String(body.outcome || '');
    if (decisionId == null || !['accepted', 'ignored', 'completed'].includes(outcome)) {
      return json({ ok: false, error: 'decisionId and outcome required' }, 400);
    }

    const existing = await req.payload.findByID({
      collection: 'adaptive-decisions',
      id: decisionId as string | number,
      overrideAccess: true,
      depth: 0,
    });
    const ownerKey = String((existing as { userKey?: string }).userKey || '');
    if (!auth.isStaff && ownerKey && ownerKey !== auth.userId) {
      return forbidden();
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
    const service = requireNeurofrigoServiceOrStaff(req);
    if (isAuthResponse(service)) return service;
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
