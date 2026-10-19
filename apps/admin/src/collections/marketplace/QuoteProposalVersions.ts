import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';

import { quoteChildCreateAccess, quoteScopedReadAccess } from '../../access/marketplace';
import { adminsOnly, hasStaffAccess } from '../../access/rbac';
import { GROUP } from './fields';
import { quoteChildBeforeChange } from './hooks';

const versionBeforeChange: CollectionBeforeChangeHook = async (args) => {
  const data = await quoteChildBeforeChange(args);
  if (data && args.operation === 'create') {
    data.sentAt = data.sentAt ?? new Date().toISOString();
    if (args.req.user && (!data.sentBy || !hasStaffAccess(args.req.user))) {
      data.sentBy = args.req.user.id;
    }
    data.currency = 'BRL';
  }
  return data;
};

/**
 * Snapshot imutável de cada envio de proposta. Criada já como enviada;
 * alteração somente por admin (correção operacional), nunca pelo parceiro.
 */
export const QuoteProposalVersions: CollectionConfig = {
  slug: 'quote-proposal-versions',
  labels: { singular: 'Versão de proposta', plural: 'Versões de proposta' },
  admin: {
    useAsTitle: 'id',
    group: GROUP,
    defaultColumns: ['proposal', 'versionNumber', 'totalCents', 'sentAt'],
    description: 'Histórico imutável de versões enviadas ao comprador.',
  },
  timestamps: true,
  access: {
    read: quoteScopedReadAccess({ buyerExtraWhere: { sentAt: { exists: true } } }),
    create: quoteChildCreateAccess(),
    update: adminsOnly,
    delete: adminsOnly,
  },
  indexes: [{ fields: ['proposal', 'versionNumber'], unique: true }],
  hooks: {
    beforeChange: [versionBeforeChange],
  },
  fields: [
    {
      name: 'proposal',
      type: 'relationship',
      relationTo: 'quote-proposals',
      required: true,
      index: true,
      label: 'Proposta',
    },
    {
      name: 'quoteRequest',
      type: 'relationship',
      relationTo: 'quote-requests',
      required: true,
      index: true,
      label: 'Solicitação de cotação',
    },
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'partners',
      required: true,
      index: true,
      label: 'Parceiro',
      admin: { readOnly: true, description: 'Derivado da cotação.' },
    },
    {
      name: 'buyerUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Comprador',
      admin: { readOnly: true, description: 'Derivado da cotação.' },
    },
    {
      name: 'versionNumber',
      type: 'number',
      required: true,
      min: 1,
      label: 'Número da versão',
    },
    {
      name: 'items',
      type: 'array',
      label: 'Itens',
      labels: { singular: 'Item', plural: 'Itens' },
      fields: [
        { name: 'description', type: 'text', required: true, label: 'Descrição' },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 1,
          label: 'Quantidade',
        },
        {
          name: 'unitPriceCents',
          type: 'number',
          required: true,
          min: 0,
          label: 'Preço unitário (centavos)',
        },
      ],
    },
    {
      name: 'subtotalCents',
      type: 'number',
      required: true,
      min: 0,
      label: 'Subtotal (centavos)',
    },
    {
      name: 'discountCents',
      type: 'number',
      min: 0,
      defaultValue: 0,
      label: 'Desconto (centavos)',
    },
    {
      name: 'shippingCents',
      type: 'number',
      min: 0,
      defaultValue: 0,
      label: 'Frete (centavos)',
    },
    {
      name: 'totalCents',
      type: 'number',
      required: true,
      min: 0,
      label: 'Total (centavos)',
    },
    {
      name: 'currency',
      type: 'text',
      required: true,
      defaultValue: 'BRL',
      label: 'Moeda',
      admin: { readOnly: true },
    },
    { name: 'validUntil', type: 'date', label: 'Válida até' },
    { name: 'deliveryDays', type: 'number', min: 0, label: 'Prazo de entrega (dias)' },
    { name: 'paymentTerms', type: 'textarea', label: 'Condições de pagamento' },
    { name: 'notes', type: 'textarea', label: 'Observações' },
    {
      name: 'sentAt',
      type: 'date',
      required: true,
      label: 'Enviada em',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'sentBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Enviada por',
      admin: { readOnly: true },
    },
  ],
};
