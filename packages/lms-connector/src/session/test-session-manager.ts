import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveLmsPolicy } from '../policy/resolve-lms-policy';
import { LmsSessionManager, lmsSessionNamespace } from './session-manager';

const policy = resolveLmsPolicy({
  role: 'student',
  defaults: {
    studentSessions: 1,
    teacherSessions: 2,
    managerSessions: 2,
    adminSessions: 2,
    sessionTtlSeconds: 3600,
    sessionHeartbeatSeconds: 60,
    revokeOldestOnExceed: true,
    downloadsAllowed: false,
    watermarkEnabled: true,
    mediaTtlSeconds: null,
    sessionPolicyEnabled: true,
  },
});

function manager() {
  return new LmsSessionManager({
    redis: null,
    appEnv: 'test',
    allowMemoryFallback: true,
  });
}

describe('Session Manager', () => {
  it('namespace por ambiente', () => {
    assert.equal(lmsSessionNamespace('development'), 'omnia:lms:sessions:development');
  });

  it('primeira sessão', async () => {
    const sm = manager();
    const { session, revokedSessionIds } = await sm.createSession({
      userId: 'u1',
      role: 'student',
      deviceId: 'd1',
      policy,
    });
    assert.ok(session.sessionId);
    assert.equal(revokedSessionIds.length, 0);
  });

  it('segundo login revoga o primeiro (aluno=1)', async () => {
    const sm = manager();
    const first = await sm.createSession({
      userId: 'u2',
      role: 'student',
      deviceId: 'd1',
      policy,
    });
    const second = await sm.createSession({
      userId: 'u2',
      role: 'student',
      deviceId: 'd2',
      policy,
    });
    assert.equal(second.revokedSessionIds.includes(first.session.sessionId), true);
    const old = await sm.getSession(first.session.sessionId);
    assert.ok(old?.revokedAt);
    assert.equal(old?.revokeReason, 'SESSION_LIMIT');
  });

  it('múltiplas abas reutilizam sessionFamilyId', async () => {
    const sm = manager();
    const family = 'family-abc';
    const a = await sm.createSession({
      userId: 'u3',
      role: 'student',
      deviceId: 'd1',
      sessionFamilyId: family,
      policy,
    });
    const b = await sm.createSession({
      userId: 'u3',
      role: 'student',
      deviceId: 'd1',
      sessionFamilyId: family,
      policy,
    });
    assert.equal(a.session.sessionId, b.session.sessionId);
    assert.equal(b.revokedSessionIds.length, 0);
  });

  it('logout revoga sessão', async () => {
    const sm = manager();
    const { session } = await sm.createSession({
      userId: 'u4',
      role: 'student',
      deviceId: 'd1',
      policy,
    });
    await sm.logout(session.sessionId, 'u4');
    const after = await sm.getSession(session.sessionId);
    assert.ok(after?.revokedAt);
  });

  it('heartbeat atualiza lastSeenAt', async () => {
    const sm = manager();
    const { session } = await sm.createSession({
      userId: 'u5',
      role: 'student',
      deviceId: 'd1',
      policy,
    });
    const before = session.lastSeenAt;
    await new Promise((r) => setTimeout(r, 5));
    const hb = await sm.heartbeat(session.sessionId, 'u5');
    assert.ok(hb.lastSeenAt >= before);
  });

  it('revogar todas', async () => {
    const sm = manager();
    const teacherPolicy = resolveLmsPolicy({
      role: 'teacher',
      defaults: {
        studentSessions: 1,
        teacherSessions: 2,
        managerSessions: 2,
        adminSessions: 2,
        sessionTtlSeconds: 3600,
        sessionHeartbeatSeconds: 60,
        revokeOldestOnExceed: true,
        downloadsAllowed: false,
        watermarkEnabled: true,
        mediaTtlSeconds: null,
        sessionPolicyEnabled: true,
      },
    });
    await sm.createSession({
      userId: 'u6',
      role: 'teacher',
      deviceId: 'd1',
      policy: teacherPolicy,
    });
    await sm.createSession({
      userId: 'u6',
      role: 'teacher',
      deviceId: 'd2',
      policy: teacherPolicy,
    });
    const n = await sm.revokeAllForUser('u6');
    assert.equal(n, 2);
    assert.equal((await sm.listActiveSessions('u6')).length, 0);
  });

  it('Redis indisponível sem fallback → erro', async () => {
    const sm = new LmsSessionManager({ redis: null, appEnv: 'test', allowMemoryFallback: false });
    await assert.rejects(() =>
      sm.createSession({
        userId: 'u7',
        role: 'student',
        deviceId: 'd1',
        policy,
      }),
    );
  });
});
