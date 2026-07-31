import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveLmsPolicy } from './resolve-lms-policy';

const defaults = {
  studentSessions: 1,
  teacherSessions: 2,
  managerSessions: 2,
  adminSessions: 2,
  sessionTtlSeconds: 3600,
  sessionHeartbeatSeconds: 60,
  revokeOldestOnExceed: true,
  downloadsAllowed: false,
  watermarkEnabled: true,
  mediaTtlSeconds: 300,
  sessionPolicyEnabled: true,
};

describe('Policy Engine', () => {
  it('aluno default 1', () => {
    const p = resolveLmsPolicy({ role: 'student', defaults });
    assert.equal(p.maxSessions, 1);
    assert.equal(p.source, 'global');
  });

  it('professor/gestor/admin default 2', () => {
    assert.equal(resolveLmsPolicy({ role: 'teacher', defaults }).maxSessions, 2);
    assert.equal(resolveLmsPolicy({ role: 'manager', defaults }).maxSessions, 2);
    assert.equal(resolveLmsPolicy({ role: 'admin', defaults }).maxSessions, 2);
  });

  it('override de usuário vence', () => {
    const p = resolveLmsPolicy({
      role: 'student',
      defaults,
      overrides: { userException: { maxSessions: 3 } },
    });
    assert.equal(p.maxSessions, 3);
    assert.equal(p.source, 'user');
  });

  it('precedência material > curso > global', () => {
    const p = resolveLmsPolicy({
      role: 'student',
      defaults,
      overrides: {
        global: { maxSessions: 1 },
        course: { maxSessions: 2 },
        material: { maxSessions: 4 },
      },
    });
    assert.equal(p.maxSessions, 4);
    assert.equal(p.source, 'material');
  });

  it('valores inválidos são clampados', () => {
    const p = resolveLmsPolicy({
      role: 'student',
      defaults: { ...defaults, studentSessions: 0 },
    });
    assert.equal(p.maxSessions, 1);
  });
});
