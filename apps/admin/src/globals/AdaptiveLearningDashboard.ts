import type { GlobalConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../access/knowledge-intelligence';

export const AdaptiveLearningDashboard: GlobalConfig = {
  slug: 'adaptive-learning-dashboard',
  label: 'Dashboard Adaptive Learning',
  admin: {
    group: 'Adaptive Learning',
    description: 'Decisões, ações por tipo, aceites e lacunas (sem vanity metrics).',
  },
  access: {
    read: kiStaffAccess,
    update: kiPublisherAccess,
  },
  fields: [
    {
      name: 'decisionsCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'actionsByType',
      type: 'json',
      admin: { readOnly: true },
    },
    {
      name: 'acceptedCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'ignoredCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'reviewRecommendedCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'avgConfidence',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'studentsWithGaps',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'studentsWithoutNextAction',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'byCourse',
      type: 'json',
      admin: { readOnly: true },
    },
    {
      name: 'avgDecideMs',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Tempo médio de decisão (ms)',
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
