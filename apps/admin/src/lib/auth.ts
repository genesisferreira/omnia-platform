import { headers as getHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';

import { getScopedAreaPath, type PlatformRole } from '@omnia/constants';

import config from '@payload-config';

import {
  canAccessGlobalAdmin,
  getUserRole,
  hasStaffAccess,
  isScopedPortalRole,
} from '@/access/rbac';

export type SessionUser = {
  id: string | number;
  email?: string | null;
  name?: string | null;
  role: PlatformRole | null;
  company: unknown;
  tenant: unknown;
};

export async function getAuthSession(): Promise<{
  user: SessionUser | null;
  payload: Awaited<ReturnType<typeof getPayload>>;
}> {
  const headers = await getHeaders();
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers });
  const raw = auth.user;

  if (!raw || raw.collection !== 'users') {
    return { user: null, payload };
  }

  const role = getUserRole(raw);
  return {
    payload,
    user: {
      id: raw.id,
      email: typeof raw.email === 'string' ? raw.email : null,
      name: typeof raw.name === 'string' ? raw.name : null,
      role,
      company: raw.company ?? null,
      tenant: raw.tenant ?? null,
    },
  };
}

export async function requireStaffSession(options?: {
  loginPath?: string;
}): Promise<{ user: SessionUser; payload: Awaited<ReturnType<typeof getPayload>> }> {
  const loginPath = options?.loginPath ?? '/login';
  const { user, payload } = await getAuthSession();

  if (!user) {
    redirect(loginPath);
  }

  if (!hasStaffAccess(user)) {
    const role = user.role;
    if (role && isScopedPortalRole(role)) {
      const area = getScopedAreaPath(role);
      if (area) {
        redirect(area);
      }
    }
    redirect('/unauthorized');
  }

  if (!canAccessGlobalAdmin(user)) {
    redirect('/unauthorized');
  }

  return { user, payload };
}

export function safeRedirectPath(candidate: string | null | undefined): string {
  if (!candidate || typeof candidate !== 'string') {
    return '/';
  }
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '/';
  }
  if (trimmed.startsWith('/login') || trimmed.startsWith('/api/')) {
    return '/';
  }
  return trimmed;
}
