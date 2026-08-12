import type { Access, FieldAccess, Where } from 'payload';

import { getRelationId, getUserRole, isEditor, isPlatformAdmin, isSuperAdmin } from './rbac';

type AuthUser = {
  id?: string | number;
  role?: unknown;
  company?: unknown;
  tenant?: unknown;
};

/** Staff editorial LMS + instructors (conteúdo próprio/empresa). */
export const LMS_CONTENT_STAFF_ROLES = ['super_admin', 'admin', 'editor', 'instructor'] as const;

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
      const where: Where = {
        or: [{ ownerCompany: { equals: companyId } }, { instructor: { equals: user.id } }],
      };
      return where;
    }
    const where: Where = { instructor: { equals: user.id } };
    return where;
  }
  return false;
};

/** Modules/Lessons/Assets: staff + instructor. */
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
    const where: Where = { status: { in: ['draft', 'review'] } };
    return where;
  }
  if (isLmsInstructor(user)) {
    const companyId = getRelationId(user.company);
    const ownership: Where =
      companyId != null
        ? {
            or: [{ instructor: { equals: user.id } }, { ownerCompany: { equals: companyId } }],
          }
        : { instructor: { equals: user.id } };
    const where: Where = {
      and: [{ status: { in: ['draft', 'review'] } }, ownership],
    };
    return where;
  }
  return false;
};

export const lmsNestedWriteAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  return isLmsPublisher(user) || isEditor(user) || isLmsInstructor(user);
};

export const lmsContentDeleteAccess: Access = ({ req: { user } }) => isLmsPublisher(user);

/** Publicar / alterar status published|archived: só publishers (via hook). */
export const lmsPublishFieldAccess: FieldAccess = ({ req: { user } }) => isLmsPublisher(user);
