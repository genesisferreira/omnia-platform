import type { GlobalConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../access/knowledge-intelligence';

export const RetrievalDashboard: GlobalConfig = {
  slug: 'retrieval-dashboard',
  label: 'Dashboard Retrieval',
  admin: {
    group: 'Retrieval',
    description:
      'Observabilidade: embeddings, fila, vetores, latência, falhas, top docs/buscas e reindexações.',
  },
  access: {
    read: kiStaffAccess,
    update: kiPublisherAccess,
  },
  fields: [
    {
      name: 'embeddingsReady',
      type: 'number',
      label: 'Embeddings ready',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'embeddingsFailed',
      type: 'number',
      label: 'Embeddings failed',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'queuePending',
      type: 'number',
      label: 'Fila pending',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'queueProcessing',
      type: 'number',
      label: 'Fila processing',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'queueFailed',
      type: 'number',
      label: 'Fila failed',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'vectorCount',
      type: 'number',
      label: 'Vetores indexados',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'avgSearchMs',
      type: 'number',
      label: 'Tempo médio busca (ms)',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'searchSessionsCount',
      type: 'number',
      label: 'Search sessions',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'reindexCount',
      type: 'number',
      label: 'Reindexações',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'topDocuments',
      type: 'json',
      label: 'Top documentos',
      admin: { readOnly: true },
    },
    {
      name: 'topQueries',
      type: 'json',
      label: 'Top buscas',
      admin: { readOnly: true },
    },
    {
      name: 'lastRefreshAt',
      type: 'date',
      label: 'Última atualização',
      admin: { date: { pickerAppearance: 'dayAndTime' }, readOnly: true },
    },
    {
      name: 'lastActivitySummary',
      type: 'text',
      label: 'Resumo',
      defaultValue: 'Sem atividade',
      admin: { readOnly: true },
    },
  ],
};
