/**
 * Testes de contrato RBAC — papéis e helpers de autorização.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PLATFORM_ROLES,
  STAFF_ROLES,
  isPlatformRole,
  isScopedPortalRole,
  isStaffRole,
} from '@omnia/constants';

import {
  canAccessGlobalAdmin,
  getRelationId,
  hasStaffAccess,
  isPlatformAdmin,
  isSuperAdmin,
} from '../access/rbac';

describe('platform roles', () => {
  it('define os sete papéis da plataforma', () => {
    assert.deepEqual(
      [...PLATFORM_ROLES],
      ['super_admin', 'admin', 'editor', 'partner', 'instructor', 'student', 'client'],
    );
  });

  it('identifica staff vs área própria', () => {
    for (const role of STAFF_ROLES) {
      assert.equal(isStaffRole(role), true);
      assert.equal(isScopedPortalRole(role), false);
    }
    for (const role of ['partner', 'instructor', 'student', 'client'] as const) {
      assert.equal(isScopedPortalRole(role), true);
      assert.equal(isStaffRole(role), false);
    }
    assert.equal(isPlatformRole('nope'), false);
  });
});

describe('rbac helpers', () => {
  it('libera painel global apenas para staff', () => {
    assert.equal(canAccessGlobalAdmin({ role: 'super_admin' }), true);
    assert.equal(canAccessGlobalAdmin({ role: 'admin' }), true);
    assert.equal(canAccessGlobalAdmin({ role: 'editor' }), true);
    assert.equal(canAccessGlobalAdmin({ role: 'partner' }), false);
    assert.equal(canAccessGlobalAdmin({ role: 'student' }), false);
    assert.equal(canAccessGlobalAdmin({ role: 'client' }), false);
    assert.equal(hasStaffAccess(null), false);
  });

  it('distingue super_admin e admin de plataforma', () => {
    assert.equal(isSuperAdmin({ role: 'super_admin' }), true);
    assert.equal(isSuperAdmin({ role: 'admin' }), false);
    assert.equal(isPlatformAdmin({ role: 'admin' }), true);
    assert.equal(isPlatformAdmin({ role: 'editor' }), false);
  });

  it('extrai id de relationship', () => {
    assert.equal(getRelationId(12), 12);
    assert.equal(getRelationId({ id: '9' }), '9');
    assert.equal(getRelationId(null), null);
  });
});

describe('password policy', () => {
  it('exige complexidade mínima', async () => {
    const { validatePasswordPolicy, PASSWORD_MIN_LENGTH } = await import('@omnia/constants');
    assert.equal(PASSWORD_MIN_LENGTH, 10);
    assert.equal(validatePasswordPolicy('short').ok, false);
    assert.equal(validatePasswordPolicy('alllowercase1!').ok, false);
    assert.equal(validatePasswordPolicy('ALLUPPERCASE1!').ok, false);
    assert.equal(validatePasswordPolicy('NoNumbers!!').ok, false);
    assert.equal(validatePasswordPolicy('NoSpecial12').ok, false);
    assert.equal(validatePasswordPolicy('ValidPass1!').ok, true);
  });
});
