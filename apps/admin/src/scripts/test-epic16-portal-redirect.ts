import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isPortalDestination,
  PORTAL_ROLES,
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
});
