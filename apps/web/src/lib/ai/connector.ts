import { getInternalApiConfig } from '@omnia/config';

import { getAdminBaseUrl } from '@/lib/auth/admin-url';
import { fetchMe } from '@/lib/auth/payload-client';
import { getSessionToken } from '@/lib/auth/session';
import type { PortalUser } from '@/lib/auth/types';

export type AiChatPayload = {
  question: string;
  sessionId?: string | number | null;
  assistantId?: string | null;
  courseId?: string | number | null;
  courseTitle?: string | null;
  moduleId?: string | number | null;
  moduleTitle?: string | null;
  lessonId?: string | number | null;
  lessonTitle?: string | null;
  lessonObjectives?: string | null;
  ownerCompanyId?: string | number | null;
  language?: string | null;
  topK?: number;
  requestStudyPlan?: boolean;
  objective?: string | null;
};

export type AiChatResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; data: unknown; error: string };

function mapRole(role: string | null | undefined): string {
  if (role === 'super_admin' || role === 'admin') return 'admin';
  if (role === 'editor') return 'manager';
  if (role === 'instructor') return 'teacher';
  return 'student';
}

/**
 * Bridge S2S Portal → Admin Neurofrigo Runtime.
 * Requires portal session. Never exposes OMNIA_INTERNAL_API_SECRET to the browser.
 */
async function buildInternalHeaders(options: {
  user?: PortalUser;
} = {}): Promise<
  | { headers: Record<string, string>; adminBase: string }
  | { error: string; status: number }
> {
  const token = await getSessionToken();
  if (!token) {
    return { error: 'UNAUTHORIZED', status: 401 };
  }

  let user = options.user;
  if (!user) {
    const me = await fetchMe(token);
    if (!me.ok) {
      return { error: 'UNAUTHORIZED', status: 401 };
    }
    user = me.data;
  }

  let secret: string;
  try {
    secret = getInternalApiConfig().secret;
  } catch {
    return { error: 'INTERNAL_MISCONFIGURED', status: 503 };
  }

  return {
    adminBase: getAdminBaseUrl(),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-omnia-internal-key': secret,
      'x-omnia-user-id': user.id,
      'x-omnia-lms-role': mapRole(user.role),
    },
  };
}

function mapBuildError(built: { error: string; status: number }): AiChatResult {
  return { ok: false, status: built.status, data: null, error: built.error };
}

export async function fetchAiChat(body: AiChatPayload): Promise<AiChatResult> {
  const built = await buildInternalHeaders();
  if ('error' in built) return mapBuildError(built);

  const url = `${built.adminBase}/api/omnia/ai/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: built.headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data,
      error: 'AI_RUNTIME_ERROR',
    };
  }

  return { ok: true, status: response.status, data };
}

export async function fetchEnterpriseAssistants(params?: {
  courseId?: string | number | null;
  role?: string | null;
  companyId?: string | number | null;
}): Promise<AiChatResult> {
  const built = await buildInternalHeaders();
  if ('error' in built) return mapBuildError(built);

  const qs = new URLSearchParams();
  if (params?.courseId != null) qs.set('courseId', String(params.courseId));
  // Role is derived server-side from session; ignore client role elevation.
  if (params?.companyId != null) qs.set('companyId', String(params.companyId));
  const url = `${built.adminBase}/api/omnia/enterprise/assistants${qs.size ? `?${qs}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: built.headers,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, status: response.status, data, error: 'ENTERPRISE_ASSISTANTS_ERROR' };
  }
  return { ok: true, status: response.status, data };
}

export async function fetchTutorChat(body: AiChatPayload): Promise<AiChatResult> {
  const built = await buildInternalHeaders();
  if ('error' in built) return mapBuildError(built);

  const url = `${built.adminBase}/api/omnia/tutor/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: built.headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, status: response.status, data, error: 'TUTOR_RUNTIME_ERROR' };
  }
  return { ok: true, status: response.status, data };
}

export async function fetchTutorProfile(courseId: string | number): Promise<AiChatResult> {
  const built = await buildInternalHeaders();
  if ('error' in built) return mapBuildError(built);

  const url = `${built.adminBase}/api/omnia/tutor/profile?courseId=${encodeURIComponent(String(courseId))}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: built.headers,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, status: response.status, data, error: 'TUTOR_PROFILE_ERROR' };
  }
  return { ok: true, status: response.status, data };
}

export async function fetchAdaptiveNext(courseId: string | number): Promise<AiChatResult> {
  const built = await buildInternalHeaders();
  if ('error' in built) return mapBuildError(built);

  const url = `${built.adminBase}/api/omnia/adaptive/next?courseId=${encodeURIComponent(String(courseId))}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: built.headers,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, status: response.status, data, error: 'ADAPTIVE_NEXT_ERROR' };
  }
  return { ok: true, status: response.status, data };
}

export async function fetchSipProfile(courseId: string | number): Promise<AiChatResult> {
  const built = await buildInternalHeaders();
  if ('error' in built) return mapBuildError(built);

  const url = `${built.adminBase}/api/omnia/sip/profile?courseId=${encodeURIComponent(String(courseId))}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: built.headers,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, status: response.status, data, error: 'SIP_PROFILE_ERROR' };
  }
  return { ok: true, status: response.status, data };
}

export async function fetchSipMotivation(body: {
  courseId: string | number;
  goals: string[];
  notes?: string | null;
}): Promise<AiChatResult> {
  const built = await buildInternalHeaders();
  if ('error' in built) return mapBuildError(built);

  const url = `${built.adminBase}/api/omnia/sip/motivation`;
  const response = await fetch(url, {
    method: 'POST',
    headers: built.headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, status: response.status, data, error: 'SIP_MOTIVATION_ERROR' };
  }
  return { ok: true, status: response.status, data };
}

export async function fetchAiFeedback(body: {
  sessionId: string | number;
  rating: 'up' | 'down';
  comment?: string;
}): Promise<AiChatResult> {
  const built = await buildInternalHeaders();
  if ('error' in built) return mapBuildError(built);

  const url = `${built.adminBase}/api/omnia/ai/feedback`;
  const response = await fetch(url, {
    method: 'POST',
    headers: built.headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, status: response.status, data, error: 'AI_FEEDBACK_ERROR' };
  }
  return { ok: true, status: response.status, data };
}
