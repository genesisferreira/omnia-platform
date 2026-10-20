import type { Access, CollectionConfig, Where } from 'payload';

import {
  getPartnerIdsWithCapability,
  quoteChildCreateAccess,
  quoteScopedReadAccess,
} from '../../access/marketplace';
import { adminsOnly, hasStaffAccess } from '../../access/rbac';
import { GROUP, PROPOSAL_STATUS_OPTIONS, staffFieldAccess } from './fields';
import { quoteChildBeforeChange } from './hooks';

/** Parceiro edita somente propostas em rascunho; após envio, nova versão em `quote-proposal-versions`. */
const proposalUpdate: Access = async ({ req: { user, payload } }) => {
  if (!user) return false;
  if (hasStaffAccess(user)) return true;
  const ids = await getPartnerIdsWithCapability(payload, user.id, 'edit');
  if (ids.length === 0) return false;
  const where: Where = { and: [{ partner: { in: ids } }, { status: { equals: 'draft' } }] };
  return where;
};

const staffUpdate = { update: staffFieldAccess } as const;

export const QuoteProposals: CollectionConfig = {
  slug: 'quote-proposals',
  labels: { singular: 'Proposta comercial', plural: 'Propostas comerciais' },
  admin: {
    useAsTitle: 'title',
    group: GROUP,
    defaultColumns: [
      'title',
      'quoteRequest',
      'partner',
      'status',
      'currentVersionNumber',
      'updatedAt',
    ],
    description: 'Propostas enviadas por parceiros em resposta a cotações.',
  },
  timestamps: true,
  access: {
    read: quoteScopedReadAccess({ buyerExtraWhere: { status: { not_equals: 'draft' } } }),
    create: quoteChildCreateAccess(),
    update: proposalUpdate,
    delete: adminsOnly,
  },
  hooks: {
    beforeChange: [quoteChildBeforeChange],
  },
  fields: [
    {
      name: 'quoteRequest',
      type: 'relationship',
      relationTo: 'quote-requests',
      required: true,
      index: true,
      label: 'Solicitação de cotação',
      access: staffUpdate,
    },
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'partners',
      required: true,
      index: true,
      label: 'Parceiro',
      access: staffUpdate,
      admin: { readOnly: true, description: 'Derivado da cotação.' },
    },
    {
      name: 'buyerUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Comprador',
      access: staffUpdate,
      admin: { readOnly: true, description: 'Derivado da cotação.' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Título',
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Resumo',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      label: 'Status',
      options: PROPOSAL_STATUS_OPTIONS,
      admin: { position: 'sidebar' },
    },
    {
      name: 'currentVersionNumber',
      type: 'number',
      min: 0,
      defaultValue: 0,
      label: 'Versão atual',
      access: staffUpdate,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'validUntil',
      type: 'date',
      label: 'Válida até',
    },
    {
      name: 'sentAt',
      type: 'date',
      label: 'Enviada em',
      access: staffUpdate,
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'respondedAt',
      type: 'date',
      label: 'Respondida em',
      access: staffUpdate,
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
};
