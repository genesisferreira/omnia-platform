import type { Endpoint, PayloadRequest } from 'payload';

import {
  bindRequestScope,
  isAuthResponse,
  requireNeurofrigoAuth,
  requireNeurofrigoServiceOrStaff,
  resolveSessionScope,
} from '../services/neurofrigo/auth-context';
import { refreshRetrievalDashboard } from '../services/retrieval/dashboard';
import { reindex } from '../services/retrieval/reindex';
import { runSemanticSearch } from '../services/retrieval/search';
import { processEmbeddingQueue } from '../services/retrieval/worker';

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

export const retrievalSearchEndpoint: Endpoint = {
  path: '/retrieval/search',
  method: 'post',
  handler: async (req) => {
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;
    const body = await readJson(req);
    const text = String(body.text || body.query || '').trim();
    if (!text) return json({ ok: false, error: 'text is required' }, 400);

    const session = await resolveSessionScope(req, auth);
    const scope = bindRequestScope({
      isStaff: auth.isStaff,
      sessionTenantId: session.tenantId,
      sessionCompanyIds: session.companyIds,
      requestedTenantId: body.tenantId != null ? String(body.tenantId) : null,
      requestedCompanyIds: body.companyIds,
      requestedChannel: body.channel != null ? String(body.channel) : null,
    });

    const result = await runSemanticSearch(
      req.payload,
      {
        text,
        tenantId: scope.tenantId,
        userId: auth.userId,
        ownerCompanyId: auth.isStaff
          ? body.ownerCompanyId != null
            ? String(body.ownerCompanyId)
            : null
          : (scope.companyIds[0] ?? null),
        courseId: body.courseId != null ? String(body.courseId) : null,
        lessonId: body.lessonId != null ? String(body.lessonId) : null,
        moduleId: body.moduleId != null ? String(body.moduleId) : null,
        language: body.language != null ? String(body.language) : null,
        tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
        topK: body.topK != null ? Number(body.topK) : 8,
      },
      {
        channel: scope.channel,
        role: auth.role,
        userId: auth.userId,
        tenantId: scope.tenantId,
        companyIds: scope.companyIds,
      },
    );

    return json({ ok: true, data: result });
  },
};

export const retrievalWorkerEndpoint: Endpoint = {
  path: '/retrieval/worker/run',
  method: 'post',
  handler: async (req) => {
    const service = requireNeurofrigoServiceOrStaff(req);
    if (isAuthResponse(service)) return service;
    const body = await readJson(req);
    const result = await processEmbeddingQueue(req.payload, {
      limit: body.limit != null ? Number(body.limit) : 20,
    });
    return json({ ok: true, data: result });
  },
};

export const retrievalReindexEndpoint: Endpoint = {
  path: '/retrieval/reindex',
  method: 'post',
  handler: async (req) => {
    const service = requireNeurofrigoServiceOrStaff(req);
    if (isAuthResponse(service)) return service;
    const body = await readJson(req);
    const mode = String(body.mode || 'partial') as 'full' | 'partial' | 'document';
    if (!['full', 'partial', 'document'].includes(mode)) {
      return json({ ok: false, error: 'invalid mode' }, 400);
    }
    const result = await reindex({
      payload: req.payload,
      mode,
      learningResourceId: body.learningResourceId as string | number | undefined,
      knowledgeDocumentId: body.knowledgeDocumentId as string | number | undefined,
    });
    return json({ ok: true, data: result });
  },
};

export const retrievalDashboardRefreshEndpoint: Endpoint = {
  path: '/retrieval/dashboard/refresh',
  method: 'post',
  handler: async (req) => {
    const service = requireNeurofrigoServiceOrStaff(req);
    if (isAuthResponse(service)) return service;
    await refreshRetrievalDashboard(req.payload);
    const dash = await req.payload.findGlobal({
      slug: 'retrieval-dashboard',
      overrideAccess: true,
    });
    return json({ ok: true, data: dash });
  },
};

export const retrievalEndpoints = [
  retrievalSearchEndpoint,
  retrievalWorkerEndpoint,
  retrievalReindexEndpoint,
  retrievalDashboardRefreshEndpoint,
];
