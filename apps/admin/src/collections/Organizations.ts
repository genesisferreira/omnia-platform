import type { CollectionConfig } from 'payload';

import { adminsOnly, authenticated } from '../access/rbac';

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  labels: {
    singular: 'Organização',
    plural: 'Organizações',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'type', 'active'],
    group: 'CRM',
    description: 'Organizações do grupo Omnia Frigo (identidade da plataforma).',
  },
  timestamps: true,
  access: {
    // Lista pública via /api/omnia/public-organizations (overrideAccess).
    read: authenticated,
    create: adminsOnly,
    update: adminsOnly,
    delete: adminsOnly,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nome',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
      index: true,
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Descrição',
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Ativo',
      defaultValue: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'vertical',
      options: [
        { label: 'Holding', value: 'holding' },
        { label: 'Vertical', value: 'vertical' },
        { label: 'Produto', value: 'product' },
        { label: 'Educação', value: 'education' },
      ],
      label: 'Tipo',
    },
  ],
};
