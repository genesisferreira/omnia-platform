import type { GlobalConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../access/knowledge-intelligence';

export const EngineeringAiDashboard: GlobalConfig = {
  slug: 'engineering-ai-dashboard',
  label: 'Dashboard Engenharia IA',
  admin: {
    group: 'Engineering IA',
    description:
      'Consultas técnicas, troubleshooting, comparações, grounding e satisfação.',
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
      label: 'Consultas técnicas',
    },
    {
      name: 'troubleshootingCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Troubleshooting',
    },
    {
      name: 'comparisonsCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Comparações',
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
