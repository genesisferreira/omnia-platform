import { getInternalApiConfig } from '@omnia/config';

import { getAdminBaseUrl } from '@/lib/auth/admin-url';
import { fetchMe } from '@/lib/auth/payload-client';
import { getSessionToken } from '@/lib/auth/session';
import type { PortalUser } from '@/lib/auth/types';
import type { LmsProxyResult } from '@/lib/lms/connector';

function mapRole(role: string | null | undefined): string {
  if (role === 'super_admin' || role === 'admin') return 'admin';
  if (role === 'editor') return 'manager';
  if (role === 'instructor') return 'teacher';
  return 'student';
}

export async function fetchAcademic<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    user?: PortalUser;
    search?: string;
  } = {},
): Promise<LmsProxyResult<T>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, status: 401, data: null, error: 'UNAUTHORIZED' };

  let user = options.user;
  if (!user) {
    const me = await fetchMe(token);
    if (!me.ok) return { ok: false, status: 401, data: null, error: 'UNAUTHORIZED' };
    user = me.data;
  }

  let secret: string;
  try {
    secret = getInternalApiConfig().secret;
  } catch {
    return { ok: false, status: 503, data: null, error: 'INTERNAL_MISCONFIGURED' };
  }

  const clean = path.replace(/^\/+/, '');
  const qs = options.search
    ? options.search.startsWith('?')
      ? options.search
      : `?${options.search}`
    : '';
  const response = await fetch(`${getAdminBaseUrl()}/api/omnia/academic/${clean}${qs}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-omnia-internal-key': secret,
      'x-omnia-user-id': user.id,
      'x-omnia-lms-role': mapRole(user.role),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });
  const data = (await response.json().catch(() => null)) as T;
  if (!response.ok) {
    return { ok: false, status: response.status, data, error: 'ACADEMIC_ERROR' };
  }
  return { ok: true, status: response.status, data };
}
