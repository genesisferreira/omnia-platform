import type { Endpoint, PayloadRequest } from 'payload';

import { isKiStaff } from '../access/knowledge-intelligence';
import {
  getSipAssistantContext,
  getSipPortalView,
  recalculateSipProfile,
  updateSipMotivation,
} from '../services/sip/profile';
import { refreshSipDashboard } from '../services/sip/dashboard';

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

export const sipProfileEndpoint: Endpoint = {
  path: '/omnia/sip/profile',
  method: 'get',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;

    const url = new URL(req.url || 'http://local');
    const courseId = url.searchParams.get('courseId') || '';
    const userKey =
      url.searchParams.get('userKey') ||
      auth.userId ||
      '';
    if (!courseId) return json({ ok: false, error: 'courseId is required' }, 400);
    if (!userKey) return json({ ok: false, error: 'userKey is required' }, 400);

    const view = await getSipPortalView(req.payload, { userKey, courseId });
    return json({ ok: true, data: view });
  },
};

export const sipContextEndpoint: Endpoint = {
  path: '/omnia/sip/context',
  method: 'get',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;
    const role = (auth.role || '').toLowerCase();
    if (!['admin', 'teacher', 'super_admin', 'publisher', 'internal'].includes(role) && !isKiStaff(req.user as { role?: unknown } | null)) {
      // Assistentes internos usam secret; students não veem contexto bruto de IA
      const secret = process.env.OMNIA_INTERNAL_API_SECRET;
      const key = req.headers.get('x-omnia-internal-key');
      if (!(secret && key && key === secret)) {
        return json({ ok: false, error: 'FORBIDDEN' }, 403);
      }
    }

    const url = new URL(req.url || 'http://local');
    const courseId = url.searchParams.get('courseId') || '';
    const userKey = url.searchParams.get('userKey') || auth.userId || '';
    if (!courseId || !userKey) return json({ ok: false, error: 'courseId and userKey required' }, 400);

    const ctx = await getSipAssistantContext(req.payload, { userKey, courseId });
    return json({ ok: true, data: ctx });
  },
};

export const sipRecalculateEndpoint: Endpoint = {
  path: '/omnia/sip/recalculate',
  method: 'post',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;
    const body = await readJson(req);
    const courseId = body.courseId != null ? String(body.courseId) : '';
    const userKey =
      (body.userKey != null ? String(body.userKey) : auth.userId) || '';
    if (!courseId || !userKey) return json({ ok: false, error: 'courseId and userKey required' }, 400);

    const result = await recalculateSipProfile(req.payload, { userKey, courseId });
    return json({
      ok: true,
      data: {
        portal: result.portal,
        technicalLevel: result.twin.identification.technicalLevel,
        competencyCount: result.twin.competencies.length,
        evidenceCount: result.twin.evidenceSummary.count,
        recommendationCount: result.twin.recommendations.length,
      },
    });
  },
};

export const sipMotivationEndpoint: Endpoint = {
  path: '/omnia/sip/motivation',
  method: 'post',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;
    const body = await readJson(req);
    const courseId = body.courseId != null ? String(body.courseId) : '';
    const userKey =
      (body.userKey != null ? String(body.userKey) : auth.userId) || '';
    if (!courseId || !userKey) return json({ ok: false, error: 'courseId and userKey required' }, 400);
    const goals = Array.isArray(body.goals) ? body.goals.map(String) : [];
    const result = await updateSipMotivation(req.payload, {
      userKey,
      courseId,
      goals,
      notes: body.notes != null ? String(body.notes) : null,
    });
    return json({ ok: true, data: result.portal });
  },
};

export const sipDashboardEndpoint: Endpoint = {
  path: '/omnia/sip/dashboard/refresh',
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
    await refreshSipDashboard(req.payload);
    const dash = await req.payload.findGlobal({
      slug: 'sip-dashboard',
      overrideAccess: true,
    });
    return json({ ok: true, data: dash });
  },
};

export const sipEndpoints = [
  sipProfileEndpoint,
  sipContextEndpoint,
  sipRecalculateEndpoint,
  sipMotivationEndpoint,
  sipDashboardEndpoint,
];
