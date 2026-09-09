import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload';

import { isStaffRole, type PlatformRole } from '@omnia/constants';
import { isSchoolKey, type SchoolKey } from '@omnia/intelligent-learning';

import {
  mediaReadAccess,
  normalizeVisibility,
  type MediaVisibility,
} from '../access/media-read';
import { getRelationId, getUserRole, staffOnly } from '../access/rbac';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Canonical persistent media path inside Docker images (see Dockerfile VOLUME). */
export const CANONICAL_MEDIA_PATH = '/app/media';

/**
 * Resolve Payload upload staticDir.
 * Priority: PAYLOAD_MEDIA_DIR → /app/media (Docker) → apps/admin/media (local).
 */
export function resolveMediaStaticDir(
  env: NodeJS.ProcessEnv = process.env,
  exists: (p: string) => boolean = existsSync,
): string {
  const fromEnv = env.PAYLOAD_MEDIA_DIR?.trim();
  if (fromEnv) {
    if (fromEnv.startsWith('/')) return fromEnv;
    return path.resolve(fromEnv);
  }
  if (exists(CANONICAL_MEDIA_PATH)) return CANONICAL_MEDIA_PATH;
  return path.resolve(__dirname, '../../media');
}

const instructorOrStaffCreate: Access = ({ req }) => {
  const role = (req.user as { role?: PlatformRole } | null)?.role;
  if (!role) return false;
  if (isStaffRole(role)) return true;
  return role === 'instructor';
};

async function actorSchoolKeys(
  payload: {
    find: (args: {
      collection: string;
      where?: Record<string, unknown>;
      limit?: number;
      depth?: number;
      overrideAccess?: boolean;
    }) => Promise<{ docs: unknown[] }>;
  },
  userId: string | number,
  role: PlatformRole | null,
): Promise<SchoolKey[]> {
  const keys = new Set<SchoolKey>();
  const add = (v: unknown) => {
    if (isSchoolKey(v)) keys.add(v);
  };
  try {
    const enrollments = await payload.find({
      collection: 'lms-enrollments',
      where: { student: { equals: userId } },
      limit: 50,
      depth: 1,
      overrideAccess: true,
    });
    for (const row of enrollments.docs as Array<Record<string, unknown>>) {
      add(row.schoolKey);
      const course = row.course;
      if (course && typeof course === 'object' && course !== null && 'schoolKey' in course) {
        add((course as { schoolKey?: unknown }).schoolKey);
      }
    }
  } catch {
    // ignore
  }
  if (role === 'instructor' || (role && isStaffRole(role))) {
    try {
      const courses = await payload.find({
        collection: 'courses',
        where: { instructor: { equals: userId } },
        limit: 50,
        depth: 0,
        overrideAccess: true,
      });
      for (const row of courses.docs as Array<Record<string, unknown>>) add(row.schoolKey);
    } catch {
      // ignore
    }
  }
  return [...keys];
}

const stampMediaAuthDefaults: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  const user = req.user as
    | { id?: string | number; role?: unknown; company?: unknown }
    | null
    | undefined;
  if (!user?.id) return data;

  const role = getUserRole(user);
  const next = { ...data } as Record<string, unknown>;

  if (operation === 'create') {
    next.uploadedBy = user.id;
    if (next.ownerCompany == null) {
      const companyId = getRelationId(user.company);
      if (companyId != null) next.ownerCompany = companyId;
    }
  }

  const schools = await actorSchoolKeys(
    req.payload as unknown as Parameters<typeof actorSchoolKeys>[0],
    user.id,
    role,
  );
  const requestedSchool = next.schoolKey;
  const staff = role != null && isStaffRole(role);

  // Non-staff cannot forge another school or force public.
  if (!staff) {
    if (requestedSchool != null && isSchoolKey(requestedSchool) && !schools.includes(requestedSchool)) {
      throw new Error('CROSS_SCHOOL: schoolKey não autorizado para este usuário');
    }
    if (normalizeVisibility(next.visibility) === 'public') {
      throw new Error('FORBIDDEN: apenas staff pode marcar Media como public');
    }
    if (operation === 'create') {
      if (schools.length === 1) {
        next.schoolKey = schools[0];
        next.visibility = (next.visibility as MediaVisibility | undefined) ?? 'school';
      } else if (!next.visibility) {
        next.visibility = 'private';
      }
    }
  } else if (operation === 'create' && !next.visibility) {
    // Staff default: private unless explicitly public/school/tenant.
    next.visibility = 'private';
  }

  if (next.visibility != null) {
    next.visibility = normalizeVisibility(next.visibility);
  }

  return next;
};

/**
 * Media Library — upload local.
 *
 * ACL (RC2.2):
 * - visibility=public → readable anonymously (explicit only)
 * - school / tenant / private → scoped; binary /api/media/file/* gated by access.read
 * - Unclassified → treated as private (never silent public)
 */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Conteúdo',
    defaultColumns: ['filename', 'alt', 'visibility', 'schoolKey', 'updatedAt'],
  },
  upload: {
    staticDir: resolveMediaStaticDir(),
    mimeTypes: [
      'image/*',
      'video/*',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
    ],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 512,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
  },
  access: {
    read: mediaReadAccess,
    create: instructorOrStaffCreate,
    update: staffOnly,
    delete: staffOnly,
  },
  hooks: {
    beforeChange: [stampMediaAuthDefaults],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Texto alternativo',
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Legenda',
    },
    {
      name: 'visibility',
      type: 'select',
      required: true,
      defaultValue: 'private',
      index: true,
      label: 'Visibilidade',
      options: [
        { label: 'Público (explícito)', value: 'public' },
        { label: 'Escola', value: 'school' },
        { label: 'Tenant / empresa', value: 'tenant' },
        { label: 'Privado', value: 'private' },
      ],
      admin: {
        description:
          'Público só para assets CMS/branding explícitos. Material acadêmico: escola ou privado.',
      },
    },
    {
      name: 'schoolKey',
      type: 'select',
      index: true,
      label: 'Escola',
      options: [
        { label: 'Fred do Frio', value: 'fred-do-frio' },
        { label: 'CTE', value: 'cte' },
      ],
    },
    {
      name: 'ownerCompany',
      type: 'relationship',
      relationTo: 'companies',
      index: true,
      label: 'Empresa dona',
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      label: 'Enviado por',
      admin: {
        readOnly: true,
      },
    },
  ],
};
