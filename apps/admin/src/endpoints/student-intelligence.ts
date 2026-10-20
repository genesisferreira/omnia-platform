import type { Endpoint, PayloadRequest } from 'payload';

import {
  forbidden,
  isAuthResponse,
  requireNeurofrigoAuth,
  requireNeurofrigoServiceOrStaff,
  resolveSubjectUserKey,
} from '../services/neurofrigo/auth-context';
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
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;

    const url = new URL(req.url || 'http://local');
    const courseId = url.searchParams.get('courseId') || '';
    if (!courseId) return json({ ok: false, error: 'courseId is required' }, 400);

    const subject = resolveSubjectUserKey(auth, url.searchParams.get('userKey'));
    if (isAuthResponse(subject)) return subject;

    const view = await getSipPortalView(req.payload, {
      userKey: subject.userKey,
      courseId,
    });
    return json({ ok: true, data: view });
  },
};

export const sipContextEndpoint: Endpoint = {
  path: '/omnia/sip/context',
  method: 'get',
  handler: async (req) => {
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;
    if (!auth.isStaff && auth.via !== 'internal') {
      return forbidden();
    }

    const url = new URL(req.url || 'http://local');
    const courseId = url.searchParams.get('courseId') || '';
    const subject = resolveSubjectUserKey(auth, url.searchParams.get('userKey'));
    if (isAuthResponse(subject)) return subject;
    if (!courseId) return json({ ok: false, error: 'courseId and userKey required' }, 400);

    const ctx = await getSipAssistantContext(req.payload, {
      userKey: subject.userKey,
      courseId,
    });
    return json({ ok: true, data: ctx });
  },
};

export const sipRecalculateEndpoint: Endpoint = {
  path: '/omnia/sip/recalculate',
  method: 'post',
  handler: async (req) => {
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;
    const body = await readJson(req);
    const courseId = body.courseId != null ? String(body.courseId) : '';
    if (!courseId) return json({ ok: false, error: 'courseId and userKey required' }, 400);

    const subject = resolveSubjectUserKey(auth, body.userKey != null ? String(body.userKey) : null);
    if (isAuthResponse(subject)) return subject;

    const result = await recalculateSipProfile(req.payload, {
      userKey: subject.userKey,
      courseId,
    });
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
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;
    const body = await readJson(req);
    const courseId = body.courseId != null ? String(body.courseId) : '';
    if (!courseId) return json({ ok: false, error: 'courseId and userKey required' }, 400);

    const subject = resolveSubjectUserKey(auth, body.userKey != null ? String(body.userKey) : null);
    if (isAuthResponse(subject)) return subject;

    const goals = Array.isArray(body.goals) ? body.goals.map(String) : [];
    const result = await updateSipMotivation(req.payload, {
      userKey: subject.userKey,
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
    const service = requireNeurofrigoServiceOrStaff(req);
    if (isAuthResponse(service)) return service;
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
