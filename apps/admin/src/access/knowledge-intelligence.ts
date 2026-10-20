import type { Access } from 'payload';

import { isEditor, isPlatformAdmin, isSuperAdmin } from './rbac';

type KiUser = { role?: unknown } | null | undefined;

/** Staff editorial + neurofrigo_admin para Knowledge Intelligence. */
export function isKiStaff(user: KiUser): boolean {
  if (!user) return false;
  if (isPlatformAdmin(user) || isEditor(user) || isSuperAdmin(user)) return true;
  return user.role === 'neurofrigo_admin';
}

export const kiStaffAccess: Access = ({ req: { user } }) => isKiStaff(user as KiUser);

export const kiPublisherAccess: Access = ({ req: { user } }) =>
  Boolean(user) &&
  (isPlatformAdmin(user as KiUser) || (user as KiUser)?.role === 'neurofrigo_admin');
