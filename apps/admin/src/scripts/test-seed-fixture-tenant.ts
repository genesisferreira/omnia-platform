/**
 * EPIC17.3 — regression: ILS V1.1 fixture users must get `users.tenant = companies.tenant`.
 *
 * Old behaviour: `payload.find({ collection: 'tenants', limit: 1 })` without sort → Payload default
 * `-createdAt` → most recent tenant (DEV: e16-tenant-b = 5) while Fred/CTE companies are in tenant 1.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  FixtureTenantError,
  resolveUserTenantFromCompany,
  tenantIdFromCompany,
  type FixtureTenantPayload,
} from '../seed/fixture-tenant';

class NotFound extends Error {
  status = 404;
}

/** DEV-shaped data: Omnia tenant 1 created first, E2E tenants 4/5 created later (more recent). */
const tenants = [
  { id: 1, slug: 'omnia-holding', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 4, slug: 'e16-tenant-a', createdAt: '2026-08-12T19:34:00.000Z' },
  { id: 5, slug: 'e16-tenant-b', createdAt: '2026-08-12T19:35:00.000Z' },
];
const companies = new Map<number, Record<string, unknown>>([
  [1, { id: 1, slug: 'omnia-frigo-holding', tenant: 1 }],
  [4, { id: 4, slug: 'fred-do-frio-academy', schoolKey: 'fred-do-frio', tenant: 1 }],
  [5, { id: 5, slug: 'cte', schoolKey: 'cte', tenant: { id: 1 } }],
  [12, { id: 12, slug: 'sem-tenant', tenant: null }],
]);

const payload: FixtureTenantPayload = {
  async findByID({ id }) {
    const doc = companies.get(Number(id));
    if (!doc) throw new NotFound(`Not Found: companies/${id}`);
    return structuredClone(doc);
  },
};

/** What the old seed did: first tenant with Payload's default sort (-createdAt). */
function legacyTenantPick(): number {
  return [...tenants].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]!.id;
}

describe('ILS V1.1 fixture user tenant resolution (SEED_REGRESSION_TEST)', () => {
  it('Fred user (company 4) gets tenant 1, not the most recent tenant', async () => {
    const tenant = await resolveUserTenantFromCompany(payload, 4);
    assert.equal(tenant, 1);
    assert.equal(legacyTenantPick(), 5, 'sanity: legacy pick reproduces the DEV bug');
    assert.notEqual(tenant, legacyTenantPick());
  });

  it('CTE user (company 5, populated relation) gets tenant 1', async () => {
    assert.equal(await resolveUserTenantFromCompany(payload, 5), 1);
    assert.equal(await resolveUserTenantFromCompany(payload, '5'), 1);
  });

  it('company without tenant fails loudly (no arbitrary tenant)', async () => {
    await assert.rejects(resolveUserTenantFromCompany(payload, 12), (err: unknown) => {
      assert.ok(err instanceof FixtureTenantError);
      assert.match(err.message, /FIXTURE_COMPANY_WITHOUT_TENANT/);
      return true;
    });
    assert.throws(() => tenantIdFromCompany({ id: 9 }), /FIXTURE_COMPANY_WITHOUT_TENANT/);
  });

  it('missing company fails loudly', async () => {
    await assert.rejects(resolveUserTenantFromCompany(payload, 404), /FIXTURE_COMPANY_NOT_FOUND/);
  });

  it('seed source no longer picks a global tenant', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, 'seed-ils-v11-fixtures.ts'), 'utf8');
    assert.doesNotMatch(source, /collection:\s*'tenants'/, 'no global tenants lookup in the seed');
    assert.match(source, /resolveUserTenantFromCompany\(payload, companyId\)/);
  });
});
