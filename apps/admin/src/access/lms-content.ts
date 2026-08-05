import type { Access, FieldAccess } from 'payload';

import {
  getRelationId,
  getUserRole,
  isEditor,
  isPlatformAdmin,
  isSuperAdmin,
} from './rbac';

type AuthUser = {
  id?: string | number;
  role?: unknown;
  company?: unknown;
  tenant?: unknown;
};

/** Staff editorial LMS + instructors (conteúdo próprio/empresa). */
export const LMS_CONTENT_STAFF_ROLES = [
  'super_admin',
  'admin',
  'editor',
  'instructor',
] as const;

export const LMS_PUBLISHER_ROLES = ['super_admin', 'admin'] as const;

function roleOf(user: AuthUser | null | undefined): string | null {
  if (typeof user?.role === 'string' && user.role.length > 0) return user.role;
  return getUserRole(user);
}

export function isLmsPublisher(user: AuthUser | null | undefined): boolean {
  const role = roleOf(user);
  return role != null && (LMS_PUBLISHER_ROLES as readonly string[]).includes(role);
}

export function isLmsInstructor(user: AuthUser | null | undefined): boolean {
  return roleOf(user) === 'instructor';
}

export function isLmsContentStaff(user: AuthUser | null | undefined): boolean {
  const role = roleOf(user);
  return role != null && (LMS_CONTENT_STAFF_ROLES as readonly string[]).includes(role);
}

/** student / partner / client: sem Admin LMS Core (só Portal). */
export function hasLmsAdminAccess(user: AuthUser | null | undefined): boolean {
  return isLmsContentStaff(user) || isSuperAdmin(user);
}

export const lmsContentReadAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isPlatformAdmin(user) || isEditor(user)) return true;
  if (isLmsInstructor(user)) {
    const companyId = getRelationId(user.company);
    if (companyId != null) {
      return {
        or: [
          { ownerCompany: { equals: companyId } },
          { instructor: { equals: user.id } },
        ],
      };
    }
    return { instructor: { equals: user.id } };
  }
  return false;
};

/** Modules/Lessons/Assets: staff vê tudo; instructor vê via course escopo no read de courses. */
export const lmsNestedReadAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isPlatformAdmin(user) || isEditor(user) || isLmsInstructor(user)) return true;
  return false;
};

export const lmsContentCreateAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  return isLmsPublisher(user) || isEditor(user) || isLmsInstructor(user);
};

export const lmsCourseUpdateAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isLmsPublisher(user)) return true;
  if (isEditor(user)) {
    return { status: { in: ['draft', 'review'] } };
  }
  if (isLmsInstructor(user)) {
    const companyId = getRelationId(user.company);
    const own: Record<string, unknown> = {
      and: [
        { status: { in: ['draft', 'review'] } },
        {
          or: [
            { instructor: { equals: user.id } },
            ...(companyId != null ? [{ ownerCompany: { equals: companyId } }] : []),
          ],
        },
      ],
    };
    return own;
  }
  return false;
};

export const lmsNestedWriteAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  return isLmsPublisher(user) || isEditor(user) || isLmsInstructor(user);
};

export const lmsContentDeleteAccess: Access = ({ req: { user } }) => isLmsPublisher(user);

/** Publicar / alterar status published|archived: só publishers. */
export const lmsPublishFieldAccess: FieldAccess = ({ req: { user } }) => isLmsPublisher(user);
