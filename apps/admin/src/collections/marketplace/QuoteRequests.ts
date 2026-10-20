import type { CollectionConfig } from 'payload';

import { buyerOrPartnerQuoteAccess, partnerMembershipScopedAccess } from '../../access/marketplace';
import { adminsOnly, authenticated } from '../../access/rbac';
import { GROUP, QUOTE_SOURCE_OPTIONS, QUOTE_STATUS_OPTIONS, staffFieldAccess } from './fields';
import { quoteRequestBeforeChange, quoteRequestBeforeValidate } from './hooks';

const staffUpdate = { update: staffFieldAccess } as const;

/**
 * Solicitações de cotação. O comprador lê as próprias; o parceiro lê as da sua empresa
 * e só altera o andamento (status). Dados informados pelo comprador são imutáveis após criação.
 */
export const QuoteRequests: CollectionConfig = {
  slug: 'quote-requests',
  labels: { singular: 'Solicitação de cotação', plural: 'Solicitações de cotação' },
  admin: {
    useAsTitle: 'publicId',
    group: GROUP,
    defaultColumns: ['publicId', 'partner', 'buyerUser', 'sourceType', 'status', 'createdAt'],
    description: 'Pedidos de cotação B2B enviados a parceiros.',
  },
  timestamps: true,
  access: {
    read: buyerOrPartnerQuoteAccess,
    create: authenticated,
    update: partnerMembershipScopedAccess('edit'),
    delete: adminsOnly,
  },
  hooks: {
    beforeValidate: [quoteRequestBeforeValidate],
    beforeChange: [quoteRequestBeforeChange],
  },
  fields: [
    {
      name: 'publicId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Código público',
      admin: { readOnly: true, description: 'Gerado automaticamente (ex.: COT-ABCDE-FGHJK).' },
    },
    {
      name: 'buyerUser',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Comprador',
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
    },
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      label: 'Origem',
      options: QUOTE_SOURCE_OPTIONS,
      access: staffUpdate,
    },
    {
      name: 'productListing',
      type: 'relationship',
      relationTo: 'partner-product-listings',
      label: 'Produto',
      access: staffUpdate,
      admin: { condition: (data) => data?.sourceType === 'product' },
    },
    {
      name: 'serviceListing',
      type: 'relationship',
      relationTo: 'partner-service-listings',
      label: 'Serviço',
      access: staffUpdate,
      admin: { condition: (data) => data?.sourceType === 'service' },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      label: 'Descrição da necessidade',
      access: staffUpdate,
    },
    {
      name: 'quantity',
      type: 'number',
      min: 1,
      label: 'Quantidade',
      access: staffUpdate,
    },
    {
      name: 'city',
      type: 'text',
      label: 'Cidade',
      index: true,
      access: staffUpdate,
    },
    {
      name: 'state',
      type: 'text',
      label: 'Estado (UF)',
      index: true,
      access: staffUpdate,
    },
    {
      name: 'desiredDate',
      type: 'date',
      label: 'Data desejada',
      access: staffUpdate,
    },
    {
      name: 'contactName',
      type: 'text',
      label: 'Nome do contato',
      access: staffUpdate,
    },
    {
      name: 'contactEmail',
      type: 'email',
      label: 'E-mail do contato',
      access: staffUpdate,
    },
    {
      name: 'contactPhone',
      type: 'text',
      label: 'Telefone do contato',
      access: staffUpdate,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'submitted',
      index: true,
      label: 'Status',
      options: QUOTE_STATUS_OPTIONS,
      admin: { position: 'sidebar' },
    },
    {
      name: 'statusChangedAt',
      type: 'date',
      label: 'Status alterado em',
      access: staffUpdate,
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
  ],
};
