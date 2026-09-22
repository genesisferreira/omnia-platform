import type { Access, FieldAccess } from 'payload';

import { isPlatformRole, isStaffRole, type PlatformRole, type StaffRole } from '@omnia/constants';

type AuthUser = {
  id?: string | number;
  role?: unknown;
  company?: unknown;
  tenant?: unknown;
  collection?: string;
};

export function getUserRole(user: AuthUser | null | undefined): PlatformRole | null {
  return isPlatformRole(user?.role) ? user.role : null;
}

export function getRelationId(value: unknown): string | number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') {
      return id;
    }
  }
  return null;
}

export function hasStaffAccess(user: AuthUser | null | undefined): boolean {
  return Boolean(user) && isStaffRole(user?.role);
}

export function hasRole(
  user: AuthUser | null | undefined,
  roles: readonly PlatformRole[],
): boolean {
  const role = getUserRole(user);
  return role != null && roles.includes(role);
}

export function isSuperAdmin(user: AuthUser | null | undefined): boolean {
  return hasRole(user, ['super_admin']);
}

export function isPlatformAdmin(user: AuthUser | null | undefined): boolean {
  return hasRole(user, ['super_admin', 'admin']);
}

export function isEditor(user: AuthUser | null | undefined): boolean {
  return hasRole(user, ['editor']);
}

export { getScopedAreaPath, isScopedPortalRole } from '@omnia/constants';

export function canAccessGlobalAdmin(user: AuthUser | null | undefined): boolean {
  return hasStaffAccess(user);
}

/** Access: qualquer usuário autenticado da collection users. */
export const authenticated: Access = ({ req: { user } }) => Boolean(user);

/** Access: staff do painel global. */
export const staffOnly: Access = ({ req: { user } }) => hasStaffAccess(user);

/** Access: super_admin ou admin. */
export const adminsOnly: Access = ({ req: { user } }) => isPlatformAdmin(user);

/** Access: somente super_admin. */
export const superAdminOnly: Access = ({ req: { user } }) => isSuperAdmin(user);

/**
 * Leitura de empresas com escopo organizacional.
 * Staff global vê tudo; demais com company vinculada veem só a própria.
 */
export const companyScopedRead: Access = ({ req: { user } }) => {
  if (!user) {
    return false;
  }
  if (isPlatformAdmin(user) || isEditor(user)) {
    if (isPlatformAdmin(user)) {
      return true;
    }
    const companyId = getRelationId(user.company);
    if (companyId != null) {
      return { id: { equals: companyId } };
    }
    // Editor sem empresa: leitura geral de conteúdo (CMS editorial)
    return true;
  }
  const companyId = getRelationId(user.company);
  if (companyId != null) {
    return { id: { equals: companyId } };
  }
  return false;
};

export const companyScopedWrite: Access = ({ req: { user } }) => {
  if (!user) {
    return false;
  }
  if (isPlatformAdmin(user)) {
    return true;
  }
  if (isEditor(user)) {
    const companyId = getRelationId(user.company);
    if (companyId != null) {
      return { id: { equals: companyId } };
    }
    return true;
  }
  return false;
};

/** Campo role: só super_admin/admin alteram; usuário não se autoeleva. */
export const roleFieldUpdateAccess: FieldAccess = ({ req: { user }, id }) => {
  if (!isPlatformAdmin(user)) {
    return false;
  }
  if (isSuperAdmin(user)) {
    return true;
  }
  // admin não edita o próprio papel nem promove a super_admin via API sem checagem no hook
  if (id != null && String(id) === String(user?.id)) {
    return false;
  }
  return true;
};

export function assertAssignableRole(
  actor: AuthUser | null | undefined,
  nextRole: unknown,
): PlatformRole {
  if (!isPlatformRole(nextRole)) {
    throw new Error('Papel inválido.');
  }
  if (isSuperAdmin(actor)) {
    return nextRole;
  }
  if (isPlatformAdmin(actor)) {
    const allowed: StaffRole[] = ['admin', 'editor'];
    if (!(allowed as readonly string[]).includes(nextRole)) {
      throw new Error('Sem permissão para atribuir este papel.');
    }
    return nextRole;
  }
  throw new Error('Sem permissão para alterar papéis.');
}
