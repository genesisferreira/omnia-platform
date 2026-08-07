import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

export const AiPolicies: CollectionConfig = {
  slug: 'ai-policies',
  labels: { singular: 'AI Policy', plural: 'AI Policies' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'priority', 'enabled', 'updatedAt'],
    group: 'Enterprise AI',
    description: 'Policy Engine — acesso por empresa/perfil/curso/tenant.',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiPublisherAccess,
    update: kiPublisherAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'assistants',
      type: 'relationship',
      relationTo: 'ai-assistants',
      hasMany: true,
      label: 'Assistentes',
    },
    {
      name: 'companies',
      type: 'relationship',
      relationTo: 'companies',
      hasMany: true,
      label: 'Empresas',
    },
    {
      name: 'roles',
      type: 'json',
      label: 'Perfis (roles)',
      admin: { description: 'Ex.: ["student","teacher","admin"]' },
    },
    {
      name: 'courses',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: true,
      label: 'Cursos',
    },
    {
      name: 'tenants',
      type: 'relationship',
      relationTo: 'tenants',
      hasMany: true,
      label: 'Tenants',
    },
    {
      name: 'allowedModels',
      type: 'relationship',
      relationTo: 'ai-models',
      hasMany: true,
      label: 'Modelos autorizados',
    },
    { name: 'priority', type: 'number', defaultValue: 10 },
    { name: 'enabled', type: 'checkbox', defaultValue: true },
  ],
};
