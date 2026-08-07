import type { GlobalConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../access/knowledge-intelligence';

export const EnterpriseAiDashboard: GlobalConfig = {
  slug: 'enterprise-ai-dashboard',
  label: 'Dashboard Enterprise AI',
  admin: {
    group: 'Enterprise AI',
    description: 'Ops AI — DeepSeek, tokens, custo, orçamento, grounding.',
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
      name: 'deepseekStatus',
      type: 'text',
      defaultValue: 'unknown',
      admin: { readOnly: true },
    },
    { name: 'tokensToday', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'tokensMonth', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'costTodayUsd', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'costMonthUsd', type: 'number', defaultValue: 0, admin: { readOnly: true } },
    { name: 'costByAssistant', type: 'json', admin: { readOnly: true } },
    { name: 'costByCompany', type: 'json', admin: { readOnly: true } },
    { name: 'costByCourse', type: 'json', admin: { readOnly: true } },
    {
      name: 'providerBalanceNote',
      type: 'text',
      defaultValue: 'Saldo não disponibilizado pelo provider',
      admin: { readOnly: true },
    },
    {
      name: 'budgetDailyUsd',
      type: 'number',
      defaultValue: 25,
      label: 'Orçamento diário (USD)',
    },
    {
      name: 'budgetMonthlyUsd',
      type: 'number',
      defaultValue: 400,
      label: 'Orçamento mensal (USD)',
    },
    {
      name: 'budgetAt100',
      type: 'select',
      defaultValue: 'warn_only',
      options: [
        { label: 'Allow', value: 'allow' },
        { label: 'Warn only', value: 'warn_only' },
        { label: 'Block', value: 'block' },
      ],
    },
    { name: 'budgetStatus', type: 'json', admin: { readOnly: true } },
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
