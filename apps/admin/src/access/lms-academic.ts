import type { Access, Where } from 'payload';

import { getRelationId, isPlatformAdmin, isSuperAdmin } from './rbac';
import { isLmsInstructor, isLmsPublisher } from './lms-content';

type AuthUser = {
  id?: string | number;
  role?: unknown;
  company?: unknown;
  tenant?: unknown;
};

export function isLmsStudent(user: AuthUser | null | undefined): boolean {
  return user?.role === 'student' || user?.role === 'client';
}

export function academicStaffAccess(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return (
    isPlatformAdmin(user) || isSuperAdmin(user) || isLmsPublisher(user) || isLmsInstructor(user)
  );
}

/** Admin Payload: staff vê tudo; instructor vê o próprio recorte. */
export const academicAdminReadAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (isPlatformAdmin(user) || isSuperAdmin(user) || isLmsPublisher(user)) return true;
  if (isLmsInstructor(user)) {
    const companyId = getRelationId(user.company);
    if (companyId != null) {
      const where: Where = {
        or: [{ ownerCompany: { equals: companyId } }, { instructor: { equals: user.id } }],
      };
      return where;
    }
    return { instructor: { equals: user.id } };
  }
  return false;
};

export const academicAdminWriteAccess: Access = ({ req: { user } }) => {
  if (!user) return false;
  return academicStaffAccess(user);
};

export const academicAdminDeleteAccess: Access = ({ req: { user } }) =>
  Boolean(user && (isPlatformAdmin(user) || isSuperAdmin(user) || isLmsPublisher(user)));
