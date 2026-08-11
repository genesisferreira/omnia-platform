import type { Endpoint } from 'payload';

import {
  isAuthResponse,
  requireNeurofrigoAuth,
  requireNeurofrigoServiceOrStaff,
} from '../services/neurofrigo/auth-context';
import { listAllowedAssistants } from '../services/enterprise/resolve';
import { refreshEnterpriseAiDashboard } from '../services/enterprise/dashboard';

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const enterpriseAssistantsEndpoint: Endpoint = {
  path: '/omnia/enterprise/assistants',
  method: 'get',
  handler: async (req) => {
    const auth = requireNeurofrigoAuth(req);
    if (isAuthResponse(auth)) return auth;
    const url = new URL(req.url || 'http://local');
    const roleParam = url.searchParams.get('role');
    const role =
      auth.isStaff && roleParam ? roleParam : auth.role || 'student';

    const evaluated = await listAllowedAssistants(req.payload, {
      role,
      userId: auth.userId,
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
    const service = requireNeurofrigoServiceOrStaff(req);
    if (isAuthResponse(service)) return service;
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
