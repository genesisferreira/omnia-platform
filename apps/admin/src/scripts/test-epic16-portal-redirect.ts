import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isPortalDestination,
  PORTAL_ROLES,
  resolveEstablishDestination,
  safePortalNextPath,
} from '../lib/portal-redirect';

describe('EPIC16 gap fix portal redirect', () => {
  it('maps safe next paths and blocks open redirects', () => {
    assert.equal(safePortalNextPath('/ia'), '/ia');
    assert.equal(safePortalNextPath('/cursos/foo'), '/cursos/foo');
    assert.equal(safePortalNextPath('https://evil.example'), '/ia');
    assert.equal(safePortalNextPath('//evil.example'), '/ia');
    assert.equal(safePortalNextPath('/area/student'), '/ia');
    assert.equal(safePortalNextPath('/admin'), '/ia');
  });

  it('recognizes portal destinations for staff next=', () => {
    assert.equal(isPortalDestination('/ia'), true);
    assert.equal(isPortalDestination('/cursos/x'), true);
    assert.equal(isPortalDestination('/aluno'), true);
    assert.equal(isPortalDestination('/professor/turmas'), true);
    assert.equal(isPortalDestination('/'), true);
    assert.equal(isPortalDestination('/admin'), false);
  });

  it('lists portal roles that must not stay on Admin /area', () => {
    assert.ok(PORTAL_ROLES.has('student'));
    assert.ok(PORTAL_ROLES.has('instructor'));
    assert.ok(PORTAL_ROLES.has('client'));
    assert.ok(PORTAL_ROLES.has('partner'));
    assert.equal(PORTAL_ROLES.has('admin'), false);
  });

  it('FRED_STUDENT_REDIRECT_OK / CTE_STUDENT_REDIRECT_OK', () => {
    assert.equal(resolveEstablishDestination('student', '/aluno'), '/aluno');
    assert.equal(resolveEstablishDestination('student', '/aluno/onboarding'), '/aluno/onboarding');
  });

  it('FRED_PROFESSOR_REDIRECT_OK / CTE_PROFESSOR_REDIRECT_OK', () => {
    assert.equal(resolveEstablishDestination('instructor', '/professor'), '/professor');
    assert.equal(resolveEstablishDestination('instructor', '/aluno/onboarding'), '/professor');
  });

  it('ADMIN_REDIRECT_OK + PORTAL_ROLE_REDIRECT_OK', () => {
    assert.equal(resolveEstablishDestination('admin', null), '/ia');
    assert.equal(resolveEstablishDestination('super_admin', '/ia'), '/ia');
    assert.equal(resolveEstablishDestination('client', null), '/ia');
    assert.equal(resolveEstablishDestination('partner', '/parceiros'), '/parceiros');
  });

  it('OPEN_REDIRECT_BLOCKED_OK + no internal host in destination', () => {
    assert.equal(safePortalNextPath('https://example.com', '/ia'), '/ia');
    assert.equal(safePortalNextPath('next=https://evil.invalid', '/ia'), '/ia');
    assert.equal(resolveEstablishDestination('student', 'https://0.0.0.0:3000/aluno'), '/aluno');
    assert.equal(resolveEstablishDestination('student', '//example.com'), '/aluno');
  });
});
