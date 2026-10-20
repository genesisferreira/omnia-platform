import type { ProvisionActor } from './types';

const ALLOWED_ROLES = new Set(['admin', 'manager']);

export function assertProvisionRole(actor: ProvisionActor): void {
  if (!ALLOWED_ROLES.has(actor.role)) {
    const err = new Error('PROVISION_FORBIDDEN');
    (err as Error & { code: string }).code = 'PROVISION_FORBIDDEN';
    throw err;
  }
}

export function requireIdempotencyKey(key: string | null | undefined): string {
  const k = key?.trim() || '';
  if (!k || k.length < 8 || k.length > 128) {
    const err = new Error('IDEMPOTENCY_KEY_REQUIRED');
    (err as Error & { code: string }).code = 'IDEMPOTENCY_KEY_REQUIRED';
    throw err;
  }
  return k;
}

export function requireCorrelationId(id: string | null | undefined): string {
  const c = id?.trim() || '';
  if (!c) {
    return `corr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return c.slice(0, 128);
}
