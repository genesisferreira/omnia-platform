import type { CollectionConfig } from 'payload';

import { quoteChildCreateAccess, quoteScopedReadAccess } from '../../access/marketplace';
import {
  GROUP,
  QUOTE_EVENT_TYPE_OPTIONS,
  QUOTE_EVENT_VISIBILITY_OPTIONS,
  QUOTE_STATUS_OPTIONS,
} from './fields';
import { quoteEventBeforeChange } from './hooks';

/** Linha do tempo append-only da cotação: sem update/delete pela API. */
export const QuoteEvents: CollectionConfig = {
  slug: 'quote-events',
  labels: { singular: 'Evento de cotação', plural: 'Eventos de cotação' },
  admin: {
    useAsTitle: 'type',
    group: GROUP,
    defaultColumns: ['quoteRequest', 'type', 'visibility', 'actor', 'createdAt'],
    description: 'Histórico imutável de eventos das cotações.',
  },
  timestamps: true,
  access: {
    read: quoteScopedReadAccess({ buyerExtraWhere: { visibility: { equals: 'shared' } } }),
    create: quoteChildCreateAccess({ allowBuyer: true }),
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [quoteEventBeforeChange],
  },
  fields: [
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
      name: 'proposal',
      type: 'relationship',
      relationTo: 'quote-proposals',
      label: 'Proposta',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      label: 'Tipo',
      options: QUOTE_EVENT_TYPE_OPTIONS,
    },
    {
      name: 'visibility',
      type: 'select',
      required: true,
      defaultValue: 'internal',
      index: true,
      label: 'Visibilidade',
      options: QUOTE_EVENT_VISIBILITY_OPTIONS,
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      label: 'Autor',
      admin: { readOnly: true },
    },
    { name: 'fromStatus', type: 'select', label: 'Status anterior', options: QUOTE_STATUS_OPTIONS },
    { name: 'toStatus', type: 'select', label: 'Novo status', options: QUOTE_STATUS_OPTIONS },
    { name: 'message', type: 'textarea', label: 'Mensagem' },
    { name: 'metadata', type: 'json', label: 'Metadados' },
  ],
};
