import type { Access, CollectionConfig } from 'payload';

import { INVITATION_STATUS_VALUES } from '@omnia/shared';

import { getPartnerIdsWithCapability } from '../../access/marketplace';
import { hasStaffAccess } from '../../access/rbac';
import { GROUP, MEMBERSHIP_ROLE_OPTIONS } from './fields';

const invitationRead: Access = async ({ req: { user, payload } }) => {
  if (!user) return false;
  if (hasStaffAccess(user)) return true;
  const ids = await getPartnerIdsWithCapability(payload, user.id, 'manage');
  return ids.length > 0 ? { partner: { in: ids } } : false;
};

/**
 * Convites para entrar na equipe de um parceiro. Criação, revogação e aceite só pelos
 * endpoints `/omnia/partner-invitations*` (token de uso único, guardado apenas como hash).
 */
export const PartnerInvitations: CollectionConfig = {
  slug: 'partner-invitations',
  labels: { singular: 'Convite de equipe', plural: 'Convites de equipe' },
  admin: {
    useAsTitle: 'email',
    group: GROUP,
    defaultColumns: ['email', 'partner', 'role', 'status', 'expiresAt', 'createdAt'],
    description:
      'Convites pessoais para o painel do parceiro. Gere pelo painel (/parceiro/equipe); o link é exibido uma única vez.',
  },
  timestamps: true,
  access: {
    read: invitationRead,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'partner', type: 'relationship', relationTo: 'partners', required: true, index: true },
    { name: 'email', type: 'email', required: true, index: true, label: 'E-mail do convidado' },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: MEMBERSHIP_ROLE_OPTIONS,
      label: 'Papel',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: INVITATION_STATUS_VALUES.map((value) => ({ label: value, value })),
    },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { read: () => false },
      admin: { hidden: true },
    },
    { name: 'expiresAt', type: 'date', required: true, label: 'Expira em' },
    { name: 'invitedBy', type: 'relationship', relationTo: 'users', label: 'Convidado por' },
    { name: 'acceptedBy', type: 'relationship', relationTo: 'users', label: 'Aceito por' },
    { name: 'acceptedAt', type: 'date' },
    { name: 'revokedBy', type: 'relationship', relationTo: 'users' },
    { name: 'revokedAt', type: 'date' },
  ],
};
