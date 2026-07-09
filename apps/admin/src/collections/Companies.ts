import type { CollectionConfig } from 'payload';

export const Companies: CollectionConfig = {
  slug: 'companies',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'ecosystemRole', 'displayOrder', 'status'],
    group: 'Multiempresa',
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      label: 'Tenant',
      admin: {
        description: 'Tenant ao qual a empresa pertence',
      },
    },
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
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      required: true,
      label: 'Descrição curta',
    },
    {
      name: 'fullDescription',
      type: 'richText',
      label: 'Descrição completa',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo',
    },
    {
      name: 'externalSite',
      type: 'text',
      label: 'Site externo',
      admin: {
        description: 'URL do site institucional da empresa',
      },
    },
    {
      name: 'ecosystemRole',
      type: 'text',
      required: true,
      label: 'Papel no ecossistema',
      admin: {
        description: 'Ex: Holding, Serviços, Educação, Tecnologia',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Ordem de exibição',
      admin: {
        description: 'Menor número aparece primeiro no portal',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Ativo', value: 'active' },
        { label: 'Inativo', value: 'inactive' },
      ],
      label: 'Status',
    },
  ],
};
