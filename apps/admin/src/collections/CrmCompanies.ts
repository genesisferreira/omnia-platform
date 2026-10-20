import type { CollectionConfig } from 'payload';

import { adminsOnly, staffOnly } from '../access/rbac';

export const CrmCompanies: CollectionConfig = {
  slug: 'crm-companies',
  labels: {
    singular: 'Empresa',
    plural: 'Empresas',
  },
  admin: {
    useAsTitle: 'tradeName',
    defaultColumns: ['tradeName', 'legalName', 'cnpj', 'status', 'city', 'updatedAt'],
    group: 'CRM',
    description: 'Contas comerciais (CRM) — distintas das empresas do Portal/ecossistema.',
  },
  timestamps: true,
  access: {
    read: staffOnly,
    create: staffOnly,
    update: staffOnly,
    delete: adminsOnly,
  },
  fields: [
    {
      name: 'legalName',
      type: 'text',
      required: true,
      label: 'Razão Social',
    },
    {
      name: 'tradeName',
      type: 'text',
      required: true,
      label: 'Nome Fantasia',
    },
    {
      name: 'cnpj',
      type: 'text',
      label: 'CNPJ',
      index: true,
    },
    {
      name: 'segment',
      type: 'text',
      label: 'Segmento',
    },
    {
      name: 'city',
      type: 'text',
      label: 'Cidade',
    },
    {
      name: 'state',
      type: 'text',
      label: 'Estado',
    },
    {
      name: 'country',
      type: 'text',
      label: 'País',
      defaultValue: 'Brasil',
    },
    {
      name: 'website',
      type: 'text',
      label: 'Website',
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      label: 'Responsável',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Telefone',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'prospect',
      options: [
        { label: 'Prospect', value: 'prospect' },
        { label: 'Ativo', value: 'active' },
        { label: 'Inativo', value: 'inactive' },
        { label: 'Churn', value: 'churn' },
      ],
      label: 'Status',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Observações',
    },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
      label: 'Tags',
    },
  ],
};
