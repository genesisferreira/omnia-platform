import { getInternalApiConfig } from '@omnia/config';

import { getAdminBaseUrl } from '@/lib/auth/admin-url';
import { fetchMe } from '@/lib/auth/payload-client';
import { getSessionToken } from '@/lib/auth/session';
import type { PortalUser } from '@/lib/auth/types';

export type LmsProxyResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: unknown; error: string };

function mapRole(role: string | null | undefined): string {
  if (role === 'super_admin' || role === 'admin') return 'admin';
  if (role === 'editor') return 'manager';
  if (role === 'instructor') return 'teacher';
  return 'student';
}

/**
 * Chama o Connector BFF no Admin via S2S (server-only).
 * Nunca expõe OMNIA_INTERNAL_API_SECRET ou token Moodle ao browser.
 */
export async function fetchLmsConnector<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    user?: PortalUser;
    search?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<LmsProxyResult<T>> {
  const token = await getSessionToken();
  if (!token) {
    return { ok: false, status: 401, data: null, error: 'UNAUTHORIZED' };
  }

  let user = options.user;
  if (!user) {
    const me = await fetchMe(token);
    if (!me.ok) {
      return { ok: false, status: 401, data: null, error: 'UNAUTHORIZED' };
    }
    user = me.data;
  }

  let secret: string;
  try {
    secret = getInternalApiConfig().secret;
  } catch {
    return { ok: false, status: 503, data: null, error: 'INTERNAL_MISCONFIGURED' };
  }

  const adminBase = getAdminBaseUrl();
  const cleanPath = path.replace(/^\/+/, '');
  const qs = options.search
    ? options.search.startsWith('?')
      ? options.search
      : `?${options.search}`
    : '';
  const url = `${adminBase}/api/omnia/lms/${cleanPath}${qs}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-omnia-internal-key': secret,
      'x-omnia-user-id': user.id,
      'x-omnia-lms-role': mapRole(user.role),
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => null)) as T;
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data,
      error: 'CONNECTOR_ERROR',
    };
  }

  return { ok: true, status: response.status, data };
}
