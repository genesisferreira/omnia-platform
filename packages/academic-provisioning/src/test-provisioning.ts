import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMemoryAudit } from './audit';
import { createDryRunMoodleWritePort } from './dry-run-write';
import { EnrollmentService } from './enrollment-service';
import { ProvisionService } from './provision-service';
import { createMemoryQueueStore, ProvisionQueue } from './queue';
import { RetryPolicy } from './retry';
import { assertProvisionRole, requireIdempotencyKey } from './security';
import type { IdentityLinkPort, ProvisionActor } from './index';

const actor: ProvisionActor = {
  omniaUserId: 'admin-1',
  role: 'admin',
  origin: 'omnia.internal',
};

function emptyIdentity(): IdentityLinkPort {
  return {
    async findActive() {
      return { exists: false };
    },
  };
}

describe('RetryPolicy', () => {
  it('exponential backoff capped', () => {
    const p = new RetryPolicy({ baseDelayMs: 100, maxDelayMs: 1000, maxAttempts: 5 });
    assert.equal(p.nextDelayMs(1), 100);
    assert.equal(p.nextDelayMs(2), 200);
    assert.equal(p.nextDelayMs(5), 1000);
    assert.equal(p.shouldRetry(4), true);
    assert.equal(p.isDeadLetter(5), true);
  });
});

describe('security', () => {
  it('requires idempotency key', () => {
    assert.throws(() => requireIdempotencyKey('short'), /IDEMPOTENCY/);
    assert.equal(requireIdempotencyKey('abcdefgh'), 'abcdefgh');
  });

  it('forbids non admin/manager', () => {
    assert.throws(
      () => assertProvisionRole({ omniaUserId: 'u', role: 'student', origin: 'omnia.internal' }),
      /PROVISION_FORBIDDEN/,
    );
  });
});

describe('ProvisionQueue', () => {
  it('dedupes by idempotency key', async () => {
    const q = new ProvisionQueue({ store: createMemoryQueueStore(), namespace: 't' });
    const a = await q.enqueue({
      type: 'user',
      action: 'create',
      payload: {},
      correlationId: 'c1',
      idempotencyKey: 'idem-key-001',
    });
    const b = await q.enqueue({
      type: 'user',
      action: 'create',
      payload: {},
      correlationId: 'c1',
      idempotencyKey: 'idem-key-001',
    });
    assert.equal(a.deduplicated, false);
    assert.equal(b.deduplicated, true);
    assert.equal(a.job.id, b.job.id);
  });

  it('moves to dead letter after max attempts', async () => {
    const q = new ProvisionQueue({
      store: createMemoryQueueStore(),
      namespace: 't2',
      retry: new RetryPolicy({ maxAttempts: 2, baseDelayMs: 1 }),
    });
    const { job } = await q.enqueue({
      type: 'user',
      action: 'create',
      payload: {},
      correlationId: 'c',
      idempotencyKey: 'idem-dlq-0001',
    });
    await q.fail(job.id, 'err1');
    const mid = await q.getJob(job.id);
    assert.equal(mid?.status, 'queued');
    await q.fail(job.id, 'err2');
    const dead = await q.getJob(job.id);
    assert.equal(dead?.status, 'dead_letter');
  });
});

describe('ProvisionService dry-run', () => {
  it('creates user in dry-run without HTTP', async () => {
    const audit = createMemoryAudit();
    const svc = new ProvisionService({
      write: createDryRunMoodleWritePort(),
      identity: emptyIdentity(),
      audit,
      forceDryRun: true,
    });
    const result = await svc.handleUser({
      action: 'create',
      omniaUserId: 'u-100',
      username: 'omnia_u100',
      email: 'u100@test.local',
      firstName: 'A',
      lastName: 'B',
      idempotencyKey: 'idem-user-create-1',
      correlationId: 'corr-1',
      actor,
    });
    assert.equal(result.ok, true);
    assert.equal(result.mode, 'dry-run');
    assert.equal(result.code, 'EXECUTE_DISABLED_UNTIL_ACTIVATION');
    assert.equal(audit.events.length, 1);
    assert.equal(audit.events[0]?.result, 'dry-run');
  });

  it('no-op when identity already linked', async () => {
    const svc = new ProvisionService({
      write: createDryRunMoodleWritePort(),
      identity: {
        async findActive() {
          return { exists: true, moodleUserId: 42, status: 'active' };
        },
      },
      audit: createMemoryAudit(),
    });
    const result = await svc.handleUser({
      action: 'create',
      omniaUserId: 'u-linked',
      idempotencyKey: 'idem-user-skip-01',
      correlationId: 'corr-2',
      actor,
    });
    assert.equal(result.ok, true);
    assert.equal(result.deduplicated, true);
    assert.equal(result.code, 'IDENTITY_ALREADY_LINKED');
  });
});

describe('EnrollmentService dry-run', () => {
  it('enrolls in dry-run', async () => {
    const svc = new EnrollmentService({
      write: createDryRunMoodleWritePort(),
      identity: {
        async findActive() {
          return { exists: true, moodleUserId: 7, status: 'active' };
        },
      },
      audit: createMemoryAudit(),
    });
    const result = await svc.handleEnrollment({
      action: 'enroll',
      omniaUserId: 'u-7',
      moodleCourseId: 10,
      idempotencyKey: 'idem-enroll-0001',
      correlationId: 'corr-e1',
      actor,
    });
    assert.equal(result.ok, true);
    assert.equal(result.mode, 'dry-run');
    assert.equal((result.simulated as { moodleCourseId?: number })?.moodleCourseId, 10);
  });
});
