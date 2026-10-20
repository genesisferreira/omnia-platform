import type { GlobalConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../access/knowledge-intelligence';

export const CommercialAiDashboard: GlobalConfig = {
  slug: 'commercial-ai-dashboard',
  label: 'Dashboard Comercial IA',
  admin: {
    group: 'Commercial IA',
    description: 'Consultas, propostas, grounding e satisfação do Comercial IA.',
  },
  access: {
    read: kiStaffAccess,
    update: kiPublisherAccess,
  },
  fields: [
    {
      name: 'consultationsCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Consultas comerciais',
    },
    {
      name: 'proposalsGenerated',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Propostas geradas',
    },
    {
      name: 'topProducts',
      type: 'json',
      admin: { readOnly: true },
      label: 'Produtos mais consultados',
    },
    {
      name: 'documentsUsed',
      type: 'json',
      admin: { readOnly: true },
      label: 'Documentos utilizados',
    },
    {
      name: 'avgGroundingScore',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Grounding médio',
    },
    {
      name: 'avgFeedbackScore',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Satisfação (−1..1)',
    },
    {
      name: 'avgTookMs',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Tempo médio (ms)',
    },
    {
      name: 'lastRefreshAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' }, readOnly: true },
    },
    {
      name: 'lastActivitySummary',
      type: 'text',
      defaultValue: 'Sem atividade',
      admin: { readOnly: true },
    },
  ],
};
