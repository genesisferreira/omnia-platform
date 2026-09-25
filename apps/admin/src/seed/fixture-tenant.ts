/**
 * Fixture tenant resolution (EPIC17.3).
 *
 * Canonical model (TENANT_ARCHITECTURE.md): Tenant ⊃ Company ⊃ User — `users.tenant` must equal the
 * tenant of the user's company. Seeds must never pick "some" tenant with a global
 * `find({ collection: 'tenants', limit: 1 })`: without an explicit sort Payload returns the most
 * recently created tenant (`-createdAt`), which is how ILS V1.1 fixture users ended up in an
 * unrelated E2E tenant while their companies stayed in the Omnia tenant.
 */

type RelationValue = string | number | { id?: string | number | null } | null | undefined;

/** Minimal Payload surface needed here (keeps the helper unit-testable without a DB). */
export type FixtureTenantPayload = {
  findByID(args: {
    collection: 'companies';
    id: string | number;
    depth?: number;
    overrideAccess?: boolean;
  }): Promise<unknown>;
};

export class FixtureTenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FixtureTenantError';
  }
}

function relationId(value: RelationValue): string | number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value.id ?? null;
  return value;
}

/** Tenant of an already-loaded company document; throws when the company has no tenant. */
export function tenantIdFromCompany(company: {
  id?: string | number;
  tenant?: RelationValue;
}): number {
  const tenant = relationId(company.tenant);
  if (tenant == null) {
    throw new FixtureTenantError(
      `FIXTURE_COMPANY_WITHOUT_TENANT: company ${String(company.id ?? '?')} has no tenant; ` +
        'refusing to guess a tenant for fixture users',
    );
  }
  const numeric = Number(tenant);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new FixtureTenantError(`FIXTURE_COMPANY_INVALID_TENANT: ${String(tenant)}`);
  }
  return numeric;
}

/**
 * Resolve the tenant a fixture user must get: `users.company → companies.tenant`.
 * Throws (fail loudly) when the company does not exist or has no tenant.
 */
export async function resolveUserTenantFromCompany(
  payload: FixtureTenantPayload,
  companyId: string | number,
): Promise<number> {
  let company: { id?: string | number; tenant?: RelationValue } | null = null;
  try {
    company = (await payload.findByID({
      collection: 'companies',
      id: companyId,
      depth: 0,
      overrideAccess: true,
    })) as { id?: string | number; tenant?: RelationValue } | null;
  } catch (err) {
    const status = (err as { status?: number } | null)?.status;
    if (status !== 404) throw err;
  }
  if (!company) {
    throw new FixtureTenantError(`FIXTURE_COMPANY_NOT_FOUND: company ${String(companyId)}`);
  }
  return tenantIdFromCompany({ ...company, id: company.id ?? companyId });
}
