import type { GlobalConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../access/knowledge-intelligence';

/**
 * Observabilidade mínima da fábrica de conhecimento (sem custos LLM).
 */
export const KiIntelligenceDashboard: GlobalConfig = {
  slug: 'ki-intelligence-dashboard',
  label: 'Dashboard KI',
  admin: {
    group: 'Knowledge Intelligence',
    description:
      'Métricas do pipeline Knowledge Intelligence: arquivos, processados, pendentes, falhas, chunks e fila.',
  },
  access: {
    read: kiStaffAccess,
    update: kiPublisherAccess,
  },
  fields: [
    {
      name: 'filesCount',
      type: 'number',
      label: 'Arquivos (Learning Resources)',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'processedCount',
      type: 'number',
      label: 'Processados',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'pendingCount',
      type: 'number',
      label: 'Pendentes / em andamento',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'failedCount',
      type: 'number',
      label: 'Falhas',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'chunksCount',
      type: 'number',
      label: 'Chunks',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'queuePendingCount',
      type: 'number',
      label: 'Fila (pending)',
      defaultValue: 0,
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
