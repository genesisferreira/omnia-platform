import type { GlobalConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../access/knowledge-intelligence';

export const NeurofrigoAiDashboard: GlobalConfig = {
  slug: 'neurofrigo-ai-dashboard',
  label: 'Dashboard Neurofrigo AI',
  admin: {
    group: 'Neurofrigo AI',
    description: 'Perguntas, latência, tokens, custo, erros, top cursos e perguntas.',
  },
  access: {
    read: kiStaffAccess,
    update: kiPublisherAccess,
  },
  fields: [
    {
      name: 'questionsCount',
      type: 'number',
      defaultValue: 0,
      label: 'Perguntas',
      admin: { readOnly: true },
    },
    {
      name: 'avgTookMs',
      type: 'number',
      defaultValue: 0,
      label: 'Tempo médio (ms)',
      admin: { readOnly: true },
    },
    {
      name: 'totalTokens',
      type: 'number',
      defaultValue: 0,
      label: 'Tokens',
      admin: { readOnly: true },
    },
    {
      name: 'estimatedCostUsd',
      type: 'number',
      defaultValue: 0,
      label: 'Custo estimado USD',
      admin: { readOnly: true },
    },
    {
      name: 'errorCount',
      type: 'number',
      defaultValue: 0,
      label: 'Erros',
      admin: { readOnly: true },
    },
    {
      name: 'notFoundCount',
      type: 'number',
      defaultValue: 0,
      label: 'Não encontrado',
      admin: { readOnly: true },
    },
    {
      name: 'topCourses',
      type: 'json',
      label: 'Top cursos',
      admin: { readOnly: true },
    },
    {
      name: 'topQuestions',
      type: 'json',
      label: 'Top perguntas',
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
