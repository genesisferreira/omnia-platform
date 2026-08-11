import assert from 'node:assert/strict';
import { timingSafeEqual } from 'node:crypto';
import test from 'node:test';

/**
 * Negative ACL helpers mirrored from auth-context (pure unit, no Payload).
 * Ensures student A cannot select student B as subject.
 */

function resolveSubjectUserKey(
  auth: { userId: string; isStaff: boolean },
  requested: string | null | undefined,
): { userKey: string } | { error: 'FORBIDDEN' } {
  const trimmed = requested?.trim() || '';
  if (!auth.isStaff) {
    if (trimmed && trimmed !== auth.userId) return { error: 'FORBIDDEN' };
    return { userKey: auth.userId };
  }
  return { userKey: trimmed || auth.userId };
}

test('student cannot spoof another userKey', () => {
  const result = resolveSubjectUserKey({ userId: 'user-a', isStaff: false }, 'user-b');
  assert.deepEqual(result, { error: 'FORBIDDEN' });
});

test('student own userKey is accepted', () => {
  const result = resolveSubjectUserKey({ userId: 'user-a', isStaff: false }, 'user-a');
  assert.deepEqual(result, { userKey: 'user-a' });
});

test('student without requested key uses auth.userId', () => {
  const result = resolveSubjectUserKey({ userId: 'user-a', isStaff: false }, null);
  assert.deepEqual(result, { userKey: 'user-a' });
});

test('staff may target another userKey', () => {
  const result = resolveSubjectUserKey({ userId: 'admin-1', isStaff: true }, 'user-b');
  assert.deepEqual(result, { userKey: 'user-b' });
});

test('internal key compare rejects length mismatch without throw', () => {
  const a = Buffer.from('short');
  const b = Buffer.from('longer-secret');
  assert.equal(a.length === b.length && timingSafeEqual(a, b), false);
});

test('anonymous identity is not a valid auth context shape', () => {
  const anonymous = { role: 'anonymous' as const };
  assert.equal('userId' in anonymous && Boolean((anonymous as { userId?: string }).userId), false);
});
