import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

export const EngineeringProfiles: CollectionConfig = {
  slug: 'engineering-profiles',
  labels: { singular: 'Engineering Profile', plural: 'Engineering Profiles' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['key', 'name', 'technicalArea', 'specialty', 'status'],
    group: 'Engineering IA',
    description: 'Perfis técnicos — Omnia Frigo Holding e unidades.',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiPublisherAccess,
    update: kiPublisherAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'name', type: 'text', required: true, label: 'Nome do perfil' },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      label: 'Empresa',
      index: true,
    },
    { name: 'companyName', type: 'text', required: true, label: 'Nome da empresa' },
    {
      name: 'technicalArea',
      type: 'text',
      required: true,
      defaultValue: 'refrigeracao-industrial',
      label: 'Área técnica',
    },
    {
      name: 'specialty',
      type: 'text',
      required: true,
      defaultValue: 'HVAC-R',
      label: 'Especialidade',
    },
    { name: 'language', type: 'text', required: true, defaultValue: 'pt-BR' },
    {
      name: 'permissions',
      type: 'json',
      label: 'Permissões',
      admin: { description: 'Ex.: ["published","allowAiUse"]' },
    },
    {
      name: 'technologyLines',
      type: 'json',
      label: 'Linhas tecnológicas autorizadas',
      admin: {
        description: 'Ex.: ["CO2","HFC","condensacao-ar","valvula-eletronica"]',
      },
    },
    {
      name: 'engineeringPolicy',
      type: 'textarea',
      label: 'Política de engenharia',
      defaultValue:
        'Nunca inventar normas, dimensionamentos ou diagnósticos definitivos. Usar somente material publicado e autorizado. Confirmação depende de inspeção técnica.',
    },
    {
      name: 'allowedModels',
      type: 'relationship',
      relationTo: 'ai-models',
      hasMany: true,
      label: 'Modelos autorizados',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Disabled', value: 'disabled' },
      ],
    },
  ],
};
