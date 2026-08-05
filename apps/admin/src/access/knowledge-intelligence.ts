import type { Access } from 'payload';

import { isEditor, isPlatformAdmin, isSuperAdmin } from './rbac';

/** Staff editorial + neurofrigo_admin para Knowledge Intelligence. */
export function isKiStaff(user: { role?: unknown } | null | undefined): boolean {
  if (!user) return false;
  if (isPlatformAdmin(user) || isEditor(user) || isSuperAdmin(user)) return true;
  return user.role === 'neurofrigo_admin';
}

export const kiStaffAccess: Access = ({ req: { user } }) => isKiStaff(user);

export const kiPublisherAccess: Access = ({ req: { user } }) =>
  Boolean(user) && (isPlatformAdmin(user) || user?.role === 'neurofrigo_admin');
