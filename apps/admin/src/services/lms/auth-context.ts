import { timingSafeEqual } from 'node:crypto';

import { getInternalApiConfig } from '@omnia/config';
import type { LmsProfileRole } from '@omnia/shared/lms';
import type { PayloadRequest } from 'payload';

import { isPlatformAdmin, isSuperAdmin } from '../../access/rbac';

const INTERNAL_KEY_HEADER = 'x-omnia-internal-key';

export type LmsAuthContext = {
  omniaUserId: string;
  role: LmsProfileRole;
  isAdmin: boolean;
  via: 'payload' | 'internal';
};

function mapPlatformRoleToLms(role: unknown): LmsProfileRole {
  if (role === 'super_admin' || role === 'admin') return 'admin';
  if (role === 'editor') return 'manager';
  if (role === 'instructor') return 'teacher';
  return 'student';
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function hasValidInternalKey(req: PayloadRequest): boolean {
  const header = req.headers.get(INTERNAL_KEY_HEADER)?.trim() || '';
  if (!header) return false;
  try {
    const { secret } = getInternalApiConfig();
    return safeEqual(header, secret);
  } catch {
    return false;
  }
}

/**
 * Resolve identidade Omnia autenticada.
 * - Sessão Payload (admin / usuário logado)
 * - S2S com x-omnia-internal-key + x-omnia-user-id (portal futuro)
 * Nunca aceita moodleUserId arbitrário do browser.
 */
export function resolveLmsAuth(req: PayloadRequest): LmsAuthContext | null {
  if (req.user) {
    return {
      omniaUserId: String(req.user.id),
      role: mapPlatformRoleToLms((req.user as { role?: unknown }).role),
      isAdmin: isPlatformAdmin(req.user) || isSuperAdmin(req.user),
      via: 'payload',
    };
  }

  if (hasValidInternalKey(req)) {
    const userId = req.headers.get('x-omnia-user-id')?.trim();
    if (!userId) return null;
    const roleHeader = req.headers.get('x-omnia-lms-role')?.trim() as LmsProfileRole | undefined;
    const role: LmsProfileRole =
      roleHeader === 'teacher' ||
      roleHeader === 'manager' ||
      roleHeader === 'admin' ||
      roleHeader === 'student'
        ? roleHeader
        : 'student';
    return {
      omniaUserId: userId,
      role,
      isAdmin: role === 'admin',
      via: 'internal',
    };
  }

  return null;
}

export function requireLmsAuth(req: PayloadRequest): LmsAuthContext {
  const ctx = resolveLmsAuth(req);
  if (!ctx) {
    const err = new Error('UNAUTHORIZED');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return ctx;
}

export function requireLmsAdmin(req: PayloadRequest): LmsAuthContext {
  const ctx = requireLmsAuth(req);
  if (!ctx.isAdmin) {
    const err = new Error('FORBIDDEN');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return ctx;
}
