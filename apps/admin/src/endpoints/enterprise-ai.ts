import type { Endpoint, PayloadRequest } from 'payload';

import { isKiStaff } from '../access/knowledge-intelligence';
import { listAllowedAssistants } from '../services/enterprise/resolve';
import { refreshEnterpriseAiDashboard } from '../services/enterprise/dashboard';

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
  return { ok: true, role: 'anonymous' };
}

export const enterpriseAssistantsEndpoint: Endpoint = {
  path: '/omnia/enterprise/assistants',
  method: 'get',
  handler: async (req) => {
    const auth = authorize(req);
    if (auth instanceof Response) return auth;
    const url = new URL(req.url || 'http://local');
    const evaluated = await listAllowedAssistants(req.payload, {
      role: url.searchParams.get('role') || auth.role || 'student',
      userId: url.searchParams.get('userId') || auth.userId || null,
      tenantId: url.searchParams.get('tenantId'),
      courseId: url.searchParams.get('courseId'),
      companyIds: url.searchParams.get('companyId')
        ? [url.searchParams.get('companyId')!]
        : undefined,
    });

    return json({
      ok: true,
      data: {
        assistants: evaluated.allowedAssistants.map((a) => ({
          id: a.id,
          key: a.key,
          slug: a.slug,
          name: a.name,
          description: a.description,
          category: a.category,
          version: a.version,
          icon: a.icon,
          avatar: a.avatar,
          color: a.color,
          visibility: a.visibility,
          language: a.language,
          capabilities: a.capabilities,
        })),
        allowedModelKeys: evaluated.allowedModelKeys,
        matchedPolicyIds: evaluated.matchedPolicyIds,
        requireGrounding: evaluated.requireGrounding,
        requireExplainability: evaluated.requireExplainability,
      },
    });
  },
};

export const enterpriseDashboardRefreshEndpoint: Endpoint = {
  path: '/omnia/enterprise/dashboard/refresh',
  method: 'post',
  handler: async (req) => {
    const secret = process.env.OMNIA_INTERNAL_API_SECRET;
    const key = req.headers.get('x-omnia-internal-key') || req.headers.get('x-omnia-internal-secret');
    if (!(secret && key === secret) && !isKiStaff(req.user as { role?: unknown } | null)) {
      return json({ ok: false, error: 'UNAUTHORIZED' }, 401);
    }
    await refreshEnterpriseAiDashboard(req.payload);
    const dash = await req.payload.findGlobal({
      slug: 'enterprise-ai-dashboard',
      overrideAccess: true,
    });
    return json({ ok: true, data: dash });
  },
};

export const enterpriseEndpoints = [
  enterpriseAssistantsEndpoint,
  enterpriseDashboardRefreshEndpoint,
];
