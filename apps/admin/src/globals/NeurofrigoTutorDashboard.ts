import type { GlobalConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../access/knowledge-intelligence';

export const NeurofrigoTutorDashboard: GlobalConfig = {
  slug: 'neurofrigo-tutor-dashboard',
  label: 'Dashboard Tutor IA',
  admin: {
    group: 'Neurofrigo Tutor',
    description:
      'Progresso médio, uso do Tutor, dúvidas, sugestões, planos e feedback.',
  },
  access: {
    read: kiStaffAccess,
    update: kiPublisherAccess,
  },
  fields: [
    {
      name: 'avgProgressPercent',
      type: 'number',
      defaultValue: 0,
      label: 'Progresso médio',
      admin: { readOnly: true },
    },
    {
      name: 'tutorAskCount',
      type: 'number',
      defaultValue: 0,
      label: 'Uso do Tutor',
      admin: { readOnly: true },
    },
    {
      name: 'topQuestions',
      type: 'json',
      label: 'Principais dúvidas',
      admin: { readOnly: true },
    },
    {
      name: 'topTopics',
      type: 'json',
      label: 'Tópicos mais consultados',
      admin: { readOnly: true },
    },
    {
      name: 'recommendationsCount',
      type: 'number',
      defaultValue: 0,
      label: 'Sugestões geradas',
      admin: { readOnly: true },
    },
    {
      name: 'studyPlansCount',
      type: 'number',
      defaultValue: 0,
      label: 'Planos criados',
      admin: { readOnly: true },
    },
    {
      name: 'avgFeedbackScore',
      type: 'number',
      defaultValue: 0,
      label: 'Feedback médio (−1..1)',
      admin: { readOnly: true },
    },
    {
      name: 'learningProfilesCount',
      type: 'number',
      defaultValue: 0,
      label: 'Learning Profiles',
      admin: { readOnly: true },
    },
    {
      name: 'studentProfilesCount',
      type: 'number',
      defaultValue: 0,
      label: 'Student Profiles',
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
      defaultValue: 'Sem atividade',
      label: 'Resumo',
      admin: { readOnly: true },
    },
  ],
};
