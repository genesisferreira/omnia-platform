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

function bindRequestScope(input: {
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

test('student cannot spoof tenantId of tenant B', () => {
  const result = bindRequestScope({
    isStaff: false,
    sessionTenantId: 'tenant-a',
    sessionCompanyIds: ['co-a'],
    requestedTenantId: 'tenant-b',
    requestedCompanyIds: ['co-b'],
    requestedChannel: 'admin',
  });
  assert.equal(result.tenantId, 'tenant-a');
  assert.deepEqual(result.companyIds, ['co-a']);
  assert.equal(result.channel, 'portal_chat');
});

test('student cannot elevate retrieval channel to system', () => {
  const result = bindRequestScope({
    isStaff: false,
    sessionTenantId: 'tenant-a',
    sessionCompanyIds: [],
    requestedChannel: 'system',
  });
  assert.equal(result.channel, 'portal_chat');
});

test('staff may target another tenant', () => {
  const result = bindRequestScope({
    isStaff: true,
    sessionTenantId: 'tenant-a',
    sessionCompanyIds: ['co-a'],
    requestedTenantId: 'tenant-b',
    requestedCompanyIds: ['co-b'],
    requestedChannel: 'admin',
  });
  assert.equal(result.tenantId, 'tenant-b');
  assert.deepEqual(result.companyIds, ['co-b']);
  assert.equal(result.channel, 'admin');
});
