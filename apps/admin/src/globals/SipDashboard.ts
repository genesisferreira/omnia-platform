import type { GlobalConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../access/knowledge-intelligence';

export const SipDashboard: GlobalConfig = {
  slug: 'sip-dashboard',
  label: 'Dashboard SIP',
  admin: {
    group: 'Student Intelligence',
    description: 'Distribuição de competências, risco, retenção e uso do Tutor (sem dados clínicos).',
  },
  access: {
    read: kiStaffAccess,
    update: kiPublisherAccess,
  },
  fields: [
    {
      name: 'profilesCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Perfis SIP',
    },
    {
      name: 'studentsAtRisk',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Alunos em risco (reviewRisk alto)',
    },
    {
      name: 'avgImt',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'IMT médio',
    },
    {
      name: 'avgRetention',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Retenção média',
    },
    {
      name: 'competencyDistribution',
      type: 'json',
      admin: { readOnly: true },
      label: 'Distribuição de competências',
    },
    {
      name: 'recommendationsCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'evidenceCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'tutorUsageSessions',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
      label: 'Sessões Tutor relacionadas',
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
