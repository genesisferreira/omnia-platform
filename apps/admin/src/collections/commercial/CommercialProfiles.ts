import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

export const CommercialProfiles: CollectionConfig = {
  slug: 'commercial-profiles',
  labels: { singular: 'Commercial Profile', plural: 'Commercial Profiles' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['key', 'name', 'segment', 'region', 'status'],
    group: 'Commercial IA',
    description: 'Perfis comerciais — Omnia Frigo Holding e unidades.',
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
      name: 'segment',
      type: 'text',
      required: true,
      defaultValue: 'refrigeracao-industrial',
      label: 'Segmento',
    },
    { name: 'region', type: 'text', required: true, defaultValue: 'BR' },
    { name: 'language', type: 'text', required: true, defaultValue: 'pt-BR' },
    {
      name: 'allowedCatalog',
      type: 'json',
      label: 'Catálogo permitido',
      admin: { description: 'Ex.: ["Neurofrigo", "Omnia LMS", "Treinamentos"]' },
    },
    {
      name: 'businessLines',
      type: 'json',
      label: 'Linhas de negócio',
      admin: { description: 'Ex.: ["Controle CO2", "Plataforma Omnia"]' },
    },
    {
      name: 'commercialPolicy',
      type: 'textarea',
      label: 'Política comercial',
      defaultValue:
        'Não inventar preços, prazos ou SLAs. Usar somente material publicado e autorizado para vendas.',
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
