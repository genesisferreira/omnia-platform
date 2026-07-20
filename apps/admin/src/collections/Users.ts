import type { Access, CollectionBeforeChangeHook, CollectionConfig, FieldAccess } from 'payload';
import { APIError } from 'payload';

import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUSES,
  PLATFORM_ROLE_LABELS,
  PLATFORM_ROLES,
  validatePasswordPolicy,
  type PlatformRole,
} from '@omnia/constants';

import {
  adminsOnly,
  assertAssignableRole,
  getUserRole,
  isPlatformAdmin,
  isSuperAdmin,
  roleFieldUpdateAccess,
} from '../access/rbac';
import {
  rejectBlockedBeforeLogin,
  rejectBlockedMe,
  rejectBlockedRefresh,
} from '../auth/account-status';
import { rateLimitNativeLogin } from '../auth/rate-limit-login';

const INTEREST_AREA_OPTIONS = [
  { label: 'Refrigeração', value: 'refrigeracao' },
  { label: 'Automação / IA', value: 'automacao' },
  { label: 'Educação', value: 'educacao' },
  { label: 'Logística / Carga', value: 'carga' },
  { label: 'Engenharia', value: 'engenharia' },
  { label: 'Parcerias', value: 'parcerias' },
];

const usersReadAccess: Access = ({ req: { user } }) => {
  if (!user) {
    return false;
  }
  if (isPlatformAdmin(user)) {
    return true;
  }
  return { id: { equals: user.id } };
};

/** Cadastro público (sem sessão) ou criação por admin. */
const usersCreateAccess: Access = ({ req: { user } }) => !user || isPlatformAdmin(user);

const usersDeleteAccess: Access = ({ req: { user } }) => isSuperAdmin(user);

const usersUpdateAccess: Access = ({ req: { user }, id }) => {
  if (!user) {
    return false;
  }
  if (isSuperAdmin(user) || isPlatformAdmin(user)) {
    return true;
  }
  return { id: { equals: user.id } };
};

const preventSelfRoleEscalation: CollectionBeforeChangeHook = ({
  data,
  req,
  originalDoc,
  operation,
}) => {
  if (!data) {
    return data;
  }

  // Self-registration / create sem sessão: força papel e status seguros.
  if (operation === 'create' && !req.user) {
    data.role = 'client';
    data.accountStatus = 'pending';
    delete data.company;
    delete data.tenant;
  }

  if (data.firstName || data.lastName) {
    const first = typeof data.firstName === 'string' ? data.firstName.trim() : '';
    const last = typeof data.lastName === 'string' ? data.lastName.trim() : '';
    const composed = [first, last].filter(Boolean).join(' ');
    if (composed) {
      data.name = composed;
    }
  }

  if (data.lgpdAccepted === true && !data.lgpdAcceptedAt && !originalDoc?.lgpdAcceptedAt) {
    data.lgpdAcceptedAt = new Date().toISOString();
  }

  if (!('role' in data)) {
    return data;
  }

  const nextRole = data.role;
  const currentRole = originalDoc?.role;
  if (nextRole === currentRole) {
    return data;
  }

  if (!req.user) {
    data.role = 'client';
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

const enforcePasswordPolicy: CollectionBeforeChangeHook = ({ data }) => {
  if (!data || typeof data.password !== 'string' || data.password.length === 0) {
    return data;
  }

  const policy = validatePasswordPolicy(data.password);
  if (!policy.ok) {
    throw new APIError(policy.error, 400);
  }

  return data;
};

const roleAdminAccess: FieldAccess = ({ req: { user } }) => isPlatformAdmin(user);
const accountStatusAdminAccess: FieldAccess = ({ req: { user } }) => isPlatformAdmin(user);

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 8,
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
    defaultColumns: ['email', 'name', 'role', 'accountStatus', 'updatedAt'],
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
    beforeOperation: [rateLimitNativeLogin],
    beforeChange: [preventSelfRoleEscalation, enforcePasswordPolicy],
    beforeLogin: [rejectBlockedBeforeLogin],
    me: [rejectBlockedMe],
    refresh: [rejectBlockedRefresh],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identidade',
          fields: [
            {
              name: 'firstName',
              type: 'text',
              label: 'Nome',
            },
            {
              name: 'lastName',
              type: 'text',
              label: 'Sobrenome',
            },
            {
              name: 'name',
              type: 'text',
              label: 'Nome completo',
              admin: {
                readOnly: true,
                description: 'Gerado a partir de nome e sobrenome.',
              },
            },
            {
              name: 'phone',
              type: 'text',
              label: 'Telefone',
            },
            {
              name: 'whatsapp',
              type: 'text',
              label: 'WhatsApp',
            },
            {
              name: 'cpf',
              type: 'text',
              label: 'CPF',
            },
            {
              name: 'photo',
              type: 'upload',
              relationTo: 'media',
              label: 'Foto',
            },
          ],
        },
        {
          label: 'Empresa',
          fields: [
            {
              name: 'employerName',
              type: 'text',
              label: 'Empresa',
            },
            {
              name: 'jobTitle',
              type: 'text',
              label: 'Cargo',
            },
            {
              name: 'segment',
              type: 'text',
              label: 'Segmento',
            },
          ],
        },
        {
          label: 'Localização',
          fields: [
            {
              name: 'country',
              type: 'text',
              label: 'País',
              defaultValue: 'Brasil',
            },
            {
              name: 'state',
              type: 'text',
              label: 'Estado',
            },
            {
              name: 'city',
              type: 'text',
              label: 'Cidade',
            },
          ],
        },
        {
          label: 'Preferências',
          fields: [
            {
              name: 'interestAreas',
              type: 'select',
              hasMany: true,
              label: 'Áreas de interesse',
              options: INTEREST_AREA_OPTIONS,
            },
            {
              name: 'groupOrganizations',
              type: 'relationship',
              relationTo: 'organizations',
              hasMany: true,
              label: 'Empresas do grupo',
              admin: {
                description: 'Organizações do ecossistema Omnia de interesse do usuário.',
              },
            },
          ],
        },
        {
          label: 'LGPD',
          fields: [
            {
              name: 'lgpdAccepted',
              type: 'checkbox',
              label: 'Aceite LGPD',
              defaultValue: false,
            },
            {
              name: 'lgpdAcceptedAt',
              type: 'date',
              label: 'Data do aceite',
              admin: {
                date: { pickerAppearance: 'dayAndTime' },
                readOnly: true,
              },
            },
          ],
        },
      ],
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'client',
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
        position: 'sidebar',
        description:
          'super_admin/admin/editor: painel global. Demais papéis: Portal / áreas próprias.',
      },
    },
    {
      name: 'accountStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: ACCOUNT_STATUSES.map((value) => ({
        label: ACCOUNT_STATUS_LABELS[value],
        value,
      })),
      label: 'Status da conta',
      access: {
        update: accountStatusAdminAccess,
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      label: 'Empresa portal (escopo)',
      admin: {
        description: 'Empresa do ecossistema (Portal) quando aplicável.',
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
        description: 'Tenant ao qual o usuário pertence.',
        position: 'sidebar',
      },
      access: {
        update: roleAdminAccess,
      },
    },
  ],
};
