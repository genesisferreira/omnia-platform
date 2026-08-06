import { getInternalApiConfig } from '@omnia/config';

import { getAdminBaseUrl } from '@/lib/auth/admin-url';
import { fetchMe } from '@/lib/auth/payload-client';
import { getSessionToken } from '@/lib/auth/session';

export type AiChatPayload = {
  question: string;
  courseId?: string | number | null;
  courseTitle?: string | null;
  moduleId?: string | number | null;
  moduleTitle?: string | null;
  lessonId?: string | number | null;
  lessonTitle?: string | null;
  ownerCompanyId?: string | number | null;
  language?: string | null;
  topK?: number;
};

export type AiChatResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; data: unknown; error: string };

/**
 * Bridge S2S Portal → Admin Neurofrigo Runtime.
 * Nunca expõe OMNIA_INTERNAL_API_SECRET ao browser.
 */
export async function fetchAiChat(body: AiChatPayload): Promise<AiChatResult> {
  let secret: string;
  try {
    secret = getInternalApiConfig().secret;
  } catch {
    return { ok: false, status: 503, data: null, error: 'INTERNAL_MISCONFIGURED' };
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

  const url = `${getAdminBaseUrl()}/api/omnia/ai/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
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
