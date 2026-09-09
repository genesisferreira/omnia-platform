import type { Access, Where } from 'payload';

import { isSchoolKey, type SchoolKey } from '@omnia/intelligent-learning';
import { isStaffRole, type PlatformRole } from '@omnia/constants';

import { getRelationId, getUserRole } from './rbac';

/** Explicit Media visibility scopes (classification-aware). */
export const MEDIA_VISIBILITIES = ['public', 'school', 'tenant', 'private'] as const;
export type MediaVisibility = (typeof MEDIA_VISIBILITIES)[number];

export type MediaAccessActor = {
  id?: string | number | null;
  role?: PlatformRole | null;
  companyId?: string | number | null;
  tenantId?: string | number | null;
  /** Schools derived from enrollments / teaching context. */
  schoolKeys?: SchoolKey[];
};

export type MediaAccessDoc = {
  visibility?: string | null;
  schoolKey?: string | null;
  ownerCompanyId?: string | number | null;
  uploadedById?: string | number | null;
};

/**
 * Pure decision for a single Media document.
 * Unclassified / missing visibility → protected (DENY unless privileged).
 */
export function decideMediaBinaryAccess(
  actor: MediaAccessActor | null,
  doc: MediaAccessDoc,
): 'ALLOW' | 'DENY' {
  const visibility = normalizeVisibility(doc.visibility);

  if (visibility === 'public') return 'ALLOW';

  if (!actor?.id) return 'DENY';

  const role = actor.role;
  if (role && isStaffRole(role)) {
    return 'ALLOW';
  }

  if (doc.uploadedById != null && String(doc.uploadedById) === String(actor.id)) {
    return 'ALLOW';
  }

  if (visibility === 'school') {
    if (!isSchoolKey(doc.schoolKey)) return 'DENY';
    const keys = actor.schoolKeys ?? [];
    return keys.includes(doc.schoolKey) ? 'ALLOW' : 'DENY';
  }

  if (visibility === 'tenant') {
    if (doc.ownerCompanyId == null) return 'DENY';
    // Prefer company scope; fall back to tenant id equality if company unset on actor.
    if (actor.companyId != null && String(actor.companyId) === String(doc.ownerCompanyId)) {
      return 'ALLOW';
    }
    return 'DENY';
  }

  // private + unknown
  return 'DENY';
}

export function normalizeVisibility(value: unknown): MediaVisibility {
  if (value === 'public' || value === 'school' || value === 'tenant' || value === 'private') {
    return value;
  }
  // Absence must NOT silently mean public for academic uploads.
  return 'private';
}

/**
 * Payload Access query for Media.read — also gates /api/media/file/*.
 */
export function buildMediaReadWhere(actor: MediaAccessActor | null): boolean | Where {
  if (!actor?.id) {
    return { visibility: { equals: 'public' } };
  }

  const role = actor.role;
  if (role && isStaffRole(role)) {
    return true;
  }

  const or: Where[] = [{ visibility: { equals: 'public' } }, { uploadedBy: { equals: actor.id } }];

  const schools = (actor.schoolKeys ?? []).filter(isSchoolKey);
  if (schools.length === 1) {
    or.push({
      and: [{ visibility: { equals: 'school' } }, { schoolKey: { equals: schools[0] } }],
    });
  } else if (schools.length > 1) {
    or.push({
      and: [{ visibility: { equals: 'school' } }, { schoolKey: { in: schools } }],
    });
  }

  if (actor.companyId != null) {
    or.push({
      and: [{ visibility: { equals: 'tenant' } }, { ownerCompany: { equals: actor.companyId } }],
    });
  }

  return { or };
}

export const mediaReadAccess: Access = async ({ req }) => {
  const user = req.user as
    | {
        id?: string | number;
        role?: unknown;
        company?: unknown;
        tenant?: unknown;
      }
    | null
    | undefined;

  if (!user?.id) {
    return buildMediaReadWhere(null);
  }

  const role = getUserRole(user);
  const companyId = getRelationId(user.company);
  const tenantId = getRelationId(user.tenant);

  // Resolve school keys from enrollments / teaching without importing heavy academic engine cycles.
  const schoolKeys = await resolveActorSchoolKeys(
    req.payload as unknown as Parameters<typeof resolveActorSchoolKeys>[0],
    {
      id: user.id,
      role,
    },
  );

  return buildMediaReadWhere({
    id: user.id,
    role,
    companyId,
    tenantId,
    schoolKeys,
  });
};

async function resolveActorSchoolKeys(
  payload: {
    find: (args: {
      collection: string;
      where?: Record<string, unknown>;
      limit?: number;
      depth?: number;
      overrideAccess?: boolean;
    }) => Promise<{ docs: Array<Record<string, unknown>> }>;
    findByID?: (args: {
      collection: string;
      id: string | number;
      depth?: number;
      overrideAccess?: boolean;
    }) => Promise<unknown>;
  },
  actor: { id: string | number; role: PlatformRole | null },
): Promise<SchoolKey[]> {
  const keys = new Set<SchoolKey>();

  const addSchool = (value: unknown) => {
    if (isSchoolKey(value)) keys.add(value);
  };

  try {
    const enrollments = await payload.find({
      collection: 'lms-enrollments',
      where: { student: { equals: actor.id } },
      limit: 50,
      depth: 1,
      overrideAccess: true,
    });
    for (const row of enrollments.docs) {
      addSchool(row.schoolKey);
      const course = row.course;
      if (course && typeof course === 'object' && 'schoolKey' in course) {
        addSchool((course as { schoolKey?: unknown }).schoolKey);
      }
    }
  } catch {
    // collection may be unavailable in unit contexts
  }

  if (actor.role === 'instructor' || (actor.role && isStaffRole(actor.role))) {
    try {
      const courses = await payload.find({
        collection: 'courses',
        where: { instructor: { equals: actor.id } },
        limit: 50,
        depth: 0,
        overrideAccess: true,
      });
      for (const row of courses.docs) addSchool(row.schoolKey);
    } catch {
      // ignore
    }
    try {
      const classes = await payload.find({
        collection: 'lms-classes',
        where: { instructor: { equals: actor.id } },
        limit: 50,
        depth: 1,
        overrideAccess: true,
      });
      for (const row of classes.docs) {
        addSchool(row.schoolKey);
        const course = row.course;
        if (course && typeof course === 'object' && 'schoolKey' in course) {
          addSchool((course as { schoolKey?: unknown }).schoolKey);
        }
      }
    } catch {
      // ignore
    }
  }

  if (payload.findByID) {
    try {
      const userDoc = await payload.findByID({
        collection: 'users',
        id: actor.id,
        depth: 1,
        overrideAccess: true,
      });
      const company = (userDoc as { company?: unknown } | null)?.company;
      if (company && typeof company === 'object' && company !== null) {
        const c = company as { schoolKey?: unknown; brandTheme?: unknown; slug?: unknown };
        if (isSchoolKey(c.schoolKey)) addSchool(c.schoolKey);
        else if (c.brandTheme === 'fred' || c.slug === 'fred-do-frio') addSchool('fred-do-frio');
        else if (c.brandTheme === 'cte' || c.slug === 'cte') addSchool('cte');
      }
    } catch {
      // ignore
    }
  }

  return [...keys];
}
