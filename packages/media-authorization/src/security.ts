import type { MediaContext, MediaPurpose } from './types';

const ALLOWED_ROLES = new Set(['student', 'teacher', 'manager', 'admin']);

export function assertMediaRole(role: string): void {
  if (!ALLOWED_ROLES.has(role)) {
    const err = new Error('MEDIA_FORBIDDEN');
    (err as Error & { code: string }).code = 'MEDIA_FORBIDDEN';
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

export function parsePurpose(raw: unknown): MediaPurpose {
  const p = String(raw || 'view');
  if (p === 'view' || p === 'preview' || p === 'download' || p === 'print' || p === 'share') {
    return p;
  }
  return 'view';
}

export function validateMediaContext(ctx: Partial<MediaContext>): asserts ctx is MediaContext {
  if (!ctx.omniaUserId?.trim()) {
    throw Object.assign(new Error('USER_REQUIRED'), { code: 'USER_REQUIRED' });
  }
  if (!ctx.assetId?.trim()) {
    throw Object.assign(new Error('ASSET_REQUIRED'), { code: 'ASSET_REQUIRED' });
  }
  if (!Number.isFinite(ctx.courseId) || (ctx.courseId as number) <= 0) {
    throw Object.assign(new Error('COURSE_REQUIRED'), { code: 'COURSE_REQUIRED' });
  }
  assertMediaRole(ctx.role || 'student');
}
