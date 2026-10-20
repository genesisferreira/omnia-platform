import type { Access, CollectionConfig, Where } from 'payload';

import { getActivePartnerIds, partnerMembershipScopedAccess } from '../../access/marketplace';
import { hasStaffAccess, staffOnly } from '../../access/rbac';
import {
  GROUP,
  MEMBERSHIP_ROLE_OPTIONS,
  MEMBERSHIP_STATUS_OPTIONS,
  staffFieldAccess,
} from './fields';
import { membershipAfterChange, membershipBeforeChange } from './hooks';

/** Staff: tudo; usuário: a própria associação e as dos parceiros em que está ativo. */
const membershipRead: Access = async ({ req: { user, payload } }) => {
  if (!user) return false;
  if (hasStaffAccess(user)) return true;
  const ids = await getActivePartnerIds(payload, user.id);
  const own: Where = { user: { equals: user.id } };
  if (ids.length === 0) return own;
  return { or: [own, { partner: { in: ids } }] };
};

export const PartnerMemberships: CollectionConfig = {
  slug: 'partner-memberships',
  labels: { singular: 'Associação de parceiro', plural: 'Associações de parceiros' },
  admin: {
    useAsTitle: 'id',
    group: GROUP,
    defaultColumns: ['user', 'partner', 'role', 'status', 'updatedAt'],
    description: 'Vínculo entre usuários e parceiros, com papel e permissões.',
  },
  timestamps: true,
  access: {
    read: membershipRead,
    // Entrada na equipe só por convite aceito (endpoint) ou pela equipe Omnia.
    create: staffOnly,
    update: partnerMembershipScopedAccess('manage'),
    // Remoção apaga o histórico; revogar (status) preserva a trilha.
    delete: staffOnly,
  },
  indexes: [{ fields: ['user', 'partner'], unique: true }],
  hooks: {
    beforeChange: [membershipBeforeChange],
    afterChange: [membershipAfterChange],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Usuário',
      access: { update: staffFieldAccess },
    },
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'partners',
      required: true,
      index: true,
      label: 'Parceiro',
      access: { update: staffFieldAccess },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'viewer',
      label: 'Papel',
      options: MEMBERSHIP_ROLE_OPTIONS,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'invited',
      index: true,
      label: 'Status',
      options: MEMBERSHIP_STATUS_OPTIONS,
    },
    {
      name: 'invitedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Convidado por',
      admin: { readOnly: true },
    },
  ],
};
