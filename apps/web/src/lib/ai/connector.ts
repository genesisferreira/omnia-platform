import { getInternalApiConfig } from '@omnia/config';

import { getAdminBaseUrl } from '@/lib/auth/admin-url';
import { fetchMe } from '@/lib/auth/payload-client';
import { getSessionToken } from '@/lib/auth/session';

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

async function buildInternalHeaders(): Promise<{
  headers: Record<string, string>;
  adminBase: string;
} | { error: string }> {
  let secret: string;
  try {
    secret = getInternalApiConfig().secret;
  } catch {
    return { error: 'INTERNAL_MISCONFIGURED' };
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-omnia-internal-key': secret,
  };

  const token = await getSessionToken();
  if (token) {
    const me = await fetchMe(token);
    if (me.ok) {
      headers['x-omnia-user-id'] = me.data.id;
      headers['x-omnia-lms-role'] =
        me.data.role === 'super_admin' || me.data.role === 'admin'
          ? 'admin'
          : me.data.role === 'instructor'
            ? 'teacher'
            : 'student';
    }
  }

  return { headers, adminBase: getAdminBaseUrl() };
}

/**
 * Bridge S2S Portal → Admin Neurofrigo Runtime.
 * Nunca expõe OMNIA_INTERNAL_API_SECRET ao browser.
 */
export async function fetchAiChat(body: AiChatPayload): Promise<AiChatResult> {
  const built = await buildInternalHeaders();
  if ('error' in built) {
    return { ok: false, status: 503, data: null, error: built.error };
  }

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
  if ('error' in built) {
    return { ok: false, status: 503, data: null, error: built.error };
  }

  const qs = new URLSearchParams();
  if (params?.courseId != null) qs.set('courseId', String(params.courseId));
  if (params?.role) qs.set('role', String(params.role));
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
  if ('error' in built) {
    return { ok: false, status: 503, data: null, error: built.error };
  }

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
  if ('error' in built) {
    return { ok: false, status: 503, data: null, error: built.error };
  }

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
  if ('error' in built) {
    return { ok: false, status: 503, data: null, error: built.error };
  }

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
  if ('error' in built) {
    return { ok: false, status: 503, data: null, error: built.error };
  }

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
  if ('error' in built) {
    return { ok: false, status: 503, data: null, error: built.error };
  }

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
  if ('error' in built) {
    return { ok: false, status: 503, data: null, error: built.error };
  }

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
