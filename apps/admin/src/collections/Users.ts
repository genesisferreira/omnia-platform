import type { Access, CollectionBeforeChangeHook, CollectionConfig, FieldAccess } from 'payload';
import { APIError } from 'payload';

import { PLATFORM_ROLE_LABELS, PLATFORM_ROLES, type PlatformRole } from '@omnia/constants';

import {
  adminsOnly,
  assertAssignableRole,
  getUserRole,
  isPlatformAdmin,
  isSuperAdmin,
  roleFieldUpdateAccess,
} from '../access/rbac';
const usersReadAccess: Access = ({ req: { user } }) => {
  if (!user) {
    return false;
  }
  if (isPlatformAdmin(user)) {
    return true;
  }
  // Usuário autenticado lê apenas o próprio documento
  return { id: { equals: user.id } };
};

const usersCreateAccess: Access = ({ req: { user } }) => isPlatformAdmin(user);

const usersDeleteAccess: Access = ({ req: { user } }) => isSuperAdmin(user);

const usersUpdateAccess: Access = ({ req: { user }, id }) => {
  if (!user) {
    return false;
  }
  if (isSuperAdmin(user)) {
    return true;
  }
  if (isPlatformAdmin(user)) {
    return true;
  }
  // Demais: somente o próprio perfil (sem alterar role — field access)
  return { id: { equals: user.id } };
};

const preventSelfRoleEscalation: CollectionBeforeChangeHook = ({ data, req, originalDoc }) => {
  if (!data || !('role' in data)) {
    return data;
  }

  const nextRole = data.role;
  const currentRole = originalDoc?.role;
  if (nextRole === currentRole) {
    return data;
  }

  try {
    const assigned = assertAssignableRole(req.user, nextRole);
    data.role = assigned;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Papel inválido.';
    throw new APIError(message, 403);
  }

  return data;
};

const roleAdminAccess: FieldAccess = ({ req: { user } }) => isPlatformAdmin(user);

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 8, // 8h
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
    maxLoginAttempts: 8,
    lockTime: 10 * 60 * 1000,
  },
  admin: {
    useAsTitle: 'email',
    group: 'Sistema',
    defaultColumns: ['email', 'name', 'role', 'company', 'updatedAt'],
  },
  access: {
    admin: ({ req: { user } }) => {
      const role = getUserRole(user);
      return role === 'super_admin' || role === 'admin' || role === 'editor';
    },
    read: usersReadAccess,
    create: usersCreateAccess,
    update: usersUpdateAccess,
    delete: usersDeleteAccess,
    unlock: adminsOnly,
  },
  hooks: {
    beforeChange: [preventSelfRoleEscalation],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nome',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: PLATFORM_ROLES.map((value) => ({
        label: PLATFORM_ROLE_LABELS[value as PlatformRole],
        value,
      })),
      label: 'Papel',
      access: {
        update: roleFieldUpdateAccess,
        create: roleAdminAccess,
      },
      admin: {
        description:
          'super_admin/admin/editor: painel global. partner/instructor/student: áreas próprias (sem CMS global).',
      },
    },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      label: 'Empresa (escopo)',
      admin: {
        description: 'Restringe o usuário a uma empresa do ecossistema quando aplicável.',
        position: 'sidebar',
      },
      access: {
        update: roleAdminAccess,
      },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      label: 'Tenant (escopo)',
      admin: {
        description: 'Organização/tenant ao qual o usuário pertence.',
        position: 'sidebar',
      },
      access: {
        update: roleAdminAccess,
      },
    },
  ],
};
