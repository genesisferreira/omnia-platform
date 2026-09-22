import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildMediaReadWhere,
  decideMediaBinaryAccess,
  normalizeVisibility,
} from '../access/media-read';

describe('media ACL policy', () => {
  it('treats missing visibility as private (not public)', () => {
    assert.equal(normalizeVisibility(null), 'private');
    assert.equal(normalizeVisibility(undefined), 'private');
    assert.equal(normalizeVisibility(''), 'private');
  });

  it('allows anonymous only for explicit public', () => {
    assert.equal(decideMediaBinaryAccess(null, { visibility: 'public' }), 'ALLOW');
    assert.equal(
      decideMediaBinaryAccess(null, { visibility: 'school', schoolKey: 'fred-do-frio' }),
      'DENY',
    );
    assert.equal(decideMediaBinaryAccess(null, { visibility: 'private' }), 'DENY');
    assert.equal(decideMediaBinaryAccess(null, { visibility: null }), 'DENY');
  });

  it('allows Fred student school media and denies CTE/isolation', () => {
    const fred = {
      id: 1,
      role: 'student' as const,
      schoolKeys: ['fred-do-frio' as const],
      companyId: 10,
    };
    const cte = {
      id: 2,
      role: 'student' as const,
      schoolKeys: ['cte' as const],
      companyId: 20,
    };
    const iso = {
      id: 3,
      role: 'student' as const,
      schoolKeys: [] as const[],
      companyId: 99,
    };
    const doc = { visibility: 'school', schoolKey: 'fred-do-frio' };
    assert.equal(decideMediaBinaryAccess(fred, doc), 'ALLOW');
    assert.equal(decideMediaBinaryAccess(cte, doc), 'DENY');
    assert.equal(decideMediaBinaryAccess(iso, doc), 'DENY');
  });

  it('denies Fred student reading CTE school media', () => {
    const fred = { id: 1, role: 'student' as const, schoolKeys: ['fred-do-frio' as const] };
    assert.equal(decideMediaBinaryAccess(fred, { visibility: 'school', schoolKey: 'cte' }), 'DENY');
  });

  it('allows instructor same school; denies cross-school instructor', () => {
    const fredInst = { id: 5, role: 'instructor' as const, schoolKeys: ['fred-do-frio' as const] };
    const cteInst = { id: 6, role: 'instructor' as const, schoolKeys: ['cte' as const] };
    const doc = { visibility: 'school', schoolKey: 'fred-do-frio' };
    assert.equal(decideMediaBinaryAccess(fredInst, doc), 'ALLOW');
    assert.equal(decideMediaBinaryAccess(cteInst, doc), 'DENY');
  });

  it('tenant visibility requires matching company', () => {
    const actor = { id: 1, role: 'student' as const, companyId: 10, schoolKeys: [] };
    assert.equal(
      decideMediaBinaryAccess(actor, { visibility: 'tenant', ownerCompanyId: 10 }),
      'ALLOW',
    );
    assert.equal(
      decideMediaBinaryAccess(actor, { visibility: 'tenant', ownerCompanyId: 11 }),
      'DENY',
    );
  });

  it('staff/admin can read protected media', () => {
    assert.equal(
      decideMediaBinaryAccess({ id: 9, role: 'admin', schoolKeys: [] }, { visibility: 'private' }),
      'ALLOW',
    );
  });

  it('anonymous read where only matches public', () => {
    assert.deepEqual(buildMediaReadWhere(null), { visibility: { equals: 'public' } });
  });

  it('authenticated student where includes school + public + own uploads', () => {
    const where = buildMediaReadWhere({
      id: 1,
      role: 'student',
      schoolKeys: ['fred-do-frio'],
      companyId: 10,
    });
    assert.notEqual(where, true);
    assert.ok(typeof where === 'object' && where !== null && 'or' in where);
  });
});
