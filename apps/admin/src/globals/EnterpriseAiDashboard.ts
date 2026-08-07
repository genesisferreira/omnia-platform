import type { GlobalConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../access/knowledge-intelligence';

export const EnterpriseAiDashboard: GlobalConfig = {
  slug: 'enterprise-ai-dashboard',
  label: 'Dashboard Enterprise AI',
  admin: {
    group: 'Enterprise AI',
    description: 'Uso por assistente/empresa, tokens, custo, grounding, satisfação.',
  },
  access: {
    read: kiStaffAccess,
    update: kiPublisherAccess,
  },
  fields: [
    { name: 'sessionsCount', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'totalTokens', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'estimatedCostUsd', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'avgGroundingScore', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'avgTookMs', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'errorCount', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'avgFeedbackScore', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'usageByAssistant', type: 'json', admin: { readOnly: true } },
    { name: 'usageByCompany', type: 'json', admin: { readOnly: true } },
    { name: 'modelsUsed', type: 'json', admin: { readOnly: true } },
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
