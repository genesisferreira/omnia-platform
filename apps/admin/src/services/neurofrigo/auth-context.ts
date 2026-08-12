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

export function requireNeurofrigoAuth(req: PayloadRequest): NeurofrigoAuthContext | Response {
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

function relationId(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return id == null ? null : String(id);
  }
  return String(value);
}

export function sessionTenantId(user: { tenant?: unknown } | null | undefined): string | null {
  return relationId(user?.tenant);
}

export function sessionCompanyIds(user: { company?: unknown } | null | undefined): string[] {
  const id = relationId(user?.company);
  return id ? [id] : [];
}

/**
 * Non-staff cannot spoof tenant/company/channel. Staff may pass explicit scope.
 */
export function bindRequestScope(input: {
  isStaff: boolean;
  sessionTenantId: string | null;
  sessionCompanyIds: string[];
  requestedTenantId?: string | null;
  requestedCompanyIds?: unknown;
  requestedChannel?: string | null;
}): {
  tenantId: string | null;
  companyIds: string[];
  channel: 'portal_chat' | 'admin' | 'system';
} {
  if (!input.isStaff) {
    return {
      tenantId: input.sessionTenantId,
      companyIds: input.sessionCompanyIds,
      channel: 'portal_chat',
    };
  }

  const requestedCompanies = Array.isArray(input.requestedCompanyIds)
    ? input.requestedCompanyIds.map(String)
    : input.sessionCompanyIds;
  const channel =
    input.requestedChannel === 'portal_chat' ||
    input.requestedChannel === 'admin' ||
    input.requestedChannel === 'system'
      ? input.requestedChannel
      : 'admin';

  return {
    tenantId: input.requestedTenantId?.trim() || input.sessionTenantId,
    companyIds: requestedCompanies,
    channel,
  };
}

/**
 * Session tenant/company for cookie users, or Payload lookup for S2S (portal BFF).
 * Never trusts client body for non-staff identity.
 */
export async function resolveSessionScope(
  req: PayloadRequest,
  auth: NeurofrigoAuthContext,
): Promise<{ tenantId: string | null; companyIds: string[] }> {
  let user = req.user as { tenant?: unknown; company?: unknown } | null | undefined;
  if (!user && auth.via === 'internal') {
    const id = /^\d+$/.test(auth.userId) ? Number(auth.userId) : auth.userId;
    const found = await req.payload
      .findByID({
        collection: 'users',
        id,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null);
    user = found as { tenant?: unknown; company?: unknown } | null;
  }
  return {
    tenantId: sessionTenantId(user),
    companyIds: sessionCompanyIds(user),
  };
}

export function isAuthResponse(value: unknown): value is Response {
  return value instanceof Response;
}
