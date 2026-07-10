import type { Field } from 'payload';

export const createOwnershipFields = (): Field[] => [
  {
    name: 'tenant',
    type: 'relationship',
    relationTo: 'tenants',
    label: 'Tenant',
    admin: {
      description: 'Tenant proprietário do conteúdo.',
      position: 'sidebar',
    },
  },
  {
    name: 'company',
    type: 'relationship',
    relationTo: 'companies',
    label: 'Empresa',
    admin: {
      description: 'Empresa associada ao conteúdo, quando aplicável.',
      position: 'sidebar',
    },
  },
  {
    name: 'visibilityScope',
    type: 'select',
    label: 'Escopo de visibilidade',
    required: true,
    defaultValue: 'holding',
    options: [
      { label: 'Holding', value: 'holding' },
      { label: 'Tenant', value: 'tenant' },
      { label: 'Empresa', value: 'company' },
      { label: 'Compartilhado', value: 'shared' },
      { label: 'Público', value: 'public' },
    ],
    admin: {
      description: 'Define o nível de visibilidade do conteúdo no ecossistema.',
      position: 'sidebar',
    },
  },
  {
    name: 'isSharedAcrossCompanies',
    type: 'checkbox',
    label: 'Compartilhado entre empresas',
    defaultValue: false,
    admin: {
      description: 'Indica se o conteúdo é compartilhado entre empresas do tenant.',
      position: 'sidebar',
    },
  },
];
