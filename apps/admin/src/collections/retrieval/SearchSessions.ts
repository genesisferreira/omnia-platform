import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

/**
 * Telemetria de buscas semânticas (sem memória de conversa).
 */
export const SearchSessions: CollectionConfig = {
  slug: 'search-sessions',
  labels: {
    singular: 'Search Session',
    plural: 'Search Sessions',
  },
  admin: {
    useAsTitle: 'query',
    defaultColumns: ['query', 'resultCount', 'tookMs', 'provider', 'createdAt'],
    group: 'Retrieval',
    description: 'Telemetria de retrieval. Sem histórico conversacional.',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiStaffAccess,
    update: kiStaffAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    { name: 'query', type: 'textarea', required: true, label: 'Pergunta' },
    { name: 'tookMs', type: 'number', required: true, label: 'Tempo (ms)', min: 0 },
    { name: 'provider', type: 'text', required: true, label: 'Provider' },
    { name: 'model', type: 'text', label: 'Modelo' },
    { name: 'resultCount', type: 'number', required: true, defaultValue: 0, label: 'Resultados' },
    {
      name: 'recoveredTokens',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Tokens recuperados',
    },
    {
      name: 'filters',
      type: 'json',
      label: 'Filtros',
    },
    {
      name: 'chunkIds',
      type: 'array',
      label: 'Chunks',
      fields: [{ name: 'chunkId', type: 'text', required: true }],
    },
    {
      name: 'scores',
      type: 'array',
      label: 'Scores',
      fields: [{ name: 'score', type: 'number', required: true }],
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      index: true,
      label: 'Tenant',
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      label: 'Usuário',
    },
    {
      name: 'ownerCompany',
      type: 'relationship',
      relationTo: 'companies',
      index: true,
      label: 'Empresa',
    },
  ],
};
