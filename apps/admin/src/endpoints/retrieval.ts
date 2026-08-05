import type { Endpoint, PayloadRequest } from 'payload';

import { isKiStaff } from '../access/knowledge-intelligence';
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

function authorize(req: PayloadRequest): Response | null {
  const secret = process.env.OMNIA_INTERNAL_API_SECRET;
  const header = req.headers.get('x-omnia-internal-secret');
  if (secret && header && header === secret) return null;
  if (isKiStaff(req.user as { role?: unknown } | null)) return null;
  return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
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
    const denied = authorize(req);
    if (denied) return denied;
    const body = await readJson(req);
    const text = String(body.text || body.query || '').trim();
    if (!text) return json({ ok: false, error: 'text is required' }, 400);

    const result = await runSemanticSearch(
      req.payload,
      {
        text,
        tenantId: body.tenantId != null ? String(body.tenantId) : null,
        userId: body.userId != null ? String(body.userId) : null,
        ownerCompanyId: body.ownerCompanyId != null ? String(body.ownerCompanyId) : null,
        courseId: body.courseId != null ? String(body.courseId) : null,
        lessonId: body.lessonId != null ? String(body.lessonId) : null,
        moduleId: body.moduleId != null ? String(body.moduleId) : null,
        language: body.language != null ? String(body.language) : null,
        tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
        topK: body.topK != null ? Number(body.topK) : 8,
      },
      {
        channel: (body.channel as 'portal_chat' | 'admin' | 'system') || 'system',
        role: (req.user as { role?: string } | null)?.role ?? null,
        userId: req.user?.id != null ? String(req.user.id) : null,
        tenantId: body.tenantId != null ? String(body.tenantId) : null,
        companyIds: Array.isArray(body.companyIds) ? body.companyIds : undefined,
      },
    );

    return json({ ok: true, data: result });
  },
};

export const retrievalWorkerEndpoint: Endpoint = {
  path: '/retrieval/worker/run',
  method: 'post',
  handler: async (req) => {
    const denied = authorize(req);
    if (denied) return denied;
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
    const denied = authorize(req);
    if (denied) return denied;
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
    const denied = authorize(req);
    if (denied) return denied;
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
