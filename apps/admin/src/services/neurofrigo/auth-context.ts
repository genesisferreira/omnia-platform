import { timingSafeEqual } from 'node:crypto';

import { getInternalApiConfig } from '@omnia/config';
import type { PayloadRequest } from 'payload';

import { isKiStaff } from '../../access/knowledge-intelligence';
import { isPlatformAdmin, isSuperAdmin } from '../../access/rbac';

const INTERNAL_KEY_HEADERS = ['x-omnia-internal-key', 'x-omnia-internal-secret'] as const;

export type NeurofrigoAuthContext = {
  userId: string;
  role: string;
  isStaff: boolean;
  via: 'payload' | 'internal';
};

export type NeurofrigoServiceAuth = {
  via: 'service' | 'staff';
  userId?: string;
  role?: string;
};

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function readInternalKey(req: PayloadRequest): string {
  for (const name of INTERNAL_KEY_HEADERS) {
    const value = req.headers.get(name)?.trim();
    if (value) return value;
  }
  return '';
}

export function hasValidInternalKey(req: PayloadRequest): boolean {
  const header = readInternalKey(req);
  if (!header) return false;
  try {
    const { secret } = getInternalApiConfig();
    return safeEqual(header, secret);
  } catch {
    return false;
  }
}

function mapRole(role: unknown): string {
  if (role == null || role === '') return 'student';
  return String(role);
}

/**
 * Resolve authenticated Neurofrigo identity.
 * - Payload session (cookie)
 * - S2S: valid internal key + x-omnia-user-id (portal/server only)
 * Never accepts anonymous. Never treats body/query userId as proof of auth.
 */
export function resolveNeurofrigoAuth(req: PayloadRequest): NeurofrigoAuthContext | null {
  if (req.user) {
    const role = mapRole((req.user as { role?: unknown }).role);
    return {
      userId: String(req.user.id),
      role,
      isStaff:
        isKiStaff(req.user as { role?: unknown }) ||
        isPlatformAdmin(req.user) ||
        isSuperAdmin(req.user),
      via: 'payload',
    };
  }

  if (hasValidInternalKey(req)) {
    const userId = req.headers.get('x-omnia-user-id')?.trim();
    if (!userId) return null;
    const role = mapRole(req.headers.get('x-omnia-lms-role')?.trim() || 'student');
    const isStaff =
      role === 'admin' ||
      role === 'super_admin' ||
      role === 'publisher' ||
      role === 'neurofrigo_admin' ||
      role === 'manager' ||
      role === 'teacher';
    return {
      userId,
      role,
      isStaff,
      via: 'internal',
    };
  }

  return null;
}

export function unauthorized(message = 'UNAUTHORIZED'): Response {
  return Response.json(
    { ok: false, error: message },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

export function forbidden(message = 'FORBIDDEN'): Response {
  return Response.json(
    { ok: false, error: message },
    { status: 403, headers: { 'Cache-Control': 'no-store' } },
  );
}

export function requireNeurofrigoAuth(
  req: PayloadRequest,
): NeurofrigoAuthContext | Response {
  const ctx = resolveNeurofrigoAuth(req);
  if (!ctx) return unauthorized();
  return ctx;
}

/**
 * Staff session OR internal service key (server-side only).
 * Used for dashboards/workers — not browser-callable without secret.
 */
export function requireNeurofrigoServiceOrStaff(
  req: PayloadRequest,
): NeurofrigoServiceAuth | Response {
  if (req.user && isKiStaff(req.user as { role?: unknown })) {
    return {
      via: 'staff',
      userId: String(req.user.id),
      role: mapRole((req.user as { role?: unknown }).role),
    };
  }
  if (hasValidInternalKey(req)) {
    return {
      via: 'service',
      userId: req.headers.get('x-omnia-user-id')?.trim() || undefined,
      role: mapRole(req.headers.get('x-omnia-lms-role')?.trim() || 'service'),
    };
  }
  return unauthorized();
}

/**
 * Resolve the subject userKey for student-scoped resources.
 * Students/non-staff: always the authenticated userId (ignore client spoof).
 * Staff: may target another userKey when explicitly provided.
 */
export function resolveSubjectUserKey(
  auth: NeurofrigoAuthContext,
  requested: string | null | undefined,
): { userKey: string } | Response {
  const trimmed = requested?.trim() || '';
  if (!auth.isStaff) {
    if (trimmed && trimmed !== auth.userId) return forbidden();
    return { userKey: auth.userId };
  }
  return { userKey: trimmed || auth.userId };
}

export function isAuthResponse(value: unknown): value is Response {
  return value instanceof Response;
}
