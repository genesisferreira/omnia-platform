import type { GlobalConfig } from 'payload';

import { knowledgeReadAccess, knowledgeSettingsAccess } from '../access/knowledge';

/**
 * Dashboard informativo do Knowledge Hub.
 * Métricas placeholder (números/texto) — sem custos/tokens reais de provider.
 */
export const NeurofrigoKnowledgeDashboard: GlobalConfig = {
  slug: 'neurofrigo-knowledge-dashboard',
  label: 'Dashboard',
  admin: {
    group: 'Neurofrigo AI',
    description:
      'Visão geral placeholder. Totais reais virão via jobs/métricas; sem saldo/custo de LLM nesta fundação.',
  },
  access: {
    read: knowledgeReadAccess,
    update: knowledgeSettingsAccess,
  },
  fields: [
    {
      name: 'placeholderNote',
      type: 'textarea',
      label: 'Aviso',
      defaultValue:
        'Dashboard Knowledge Hub — fundação. Campos abaixo são placeholders tipados para o futuro AI Operations Center. Não representam custos reais, tokens ou saldo de provider.',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'totalDocuments',
      type: 'number',
      label: 'Total de documentos',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'draftCount',
      type: 'number',
      label: 'Rascunhos',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'inReviewCount',
      type: 'number',
      label: 'Em revisão',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'approvedCount',
      type: 'number',
      label: 'Aprovados',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'publishedCount',
      type: 'number',
      label: 'Publicados',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'expiredCount',
      type: 'number',
      label: 'Expirados',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'processingErrorCount',
      type: 'number',
      label: 'Erros de processamento',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'pendingReviewsCount',
      type: 'number',
      label: 'Revisões pendentes',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'documentsByClassification',
      type: 'textarea',
      label: 'Por classificação (texto)',
      defaultValue:
        'PUBLIC:0 | CLIENT_PARTNER:0 | STUDENT:0 | TEACHER_MANAGER:0 | INTERNAL_RESTRICTED:0',
      admin: { readOnly: true },
    },
    {
      name: 'documentsByCompany',
      type: 'textarea',
      label: 'Por empresa (texto)',
      defaultValue: '(sem dados)',
      admin: { readOnly: true },
    },
    {
      name: 'documentsByArea',
      type: 'textarea',
      label: 'Por área (texto)',
      defaultValue: '(sem dados)',
      admin: { readOnly: true },
    },
    {
      name: 'lastActivitySummary',
      type: 'text',
      label: 'Última atividade',
      defaultValue: 'Nenhuma atividade registrada',
      admin: { readOnly: true },
    },
    {
      name: 'futureCostPlaceholder',
      type: 'text',
      label: 'Custo futuro (placeholder)',
      defaultValue: 'n/a — sem provider',
      admin: {
        readOnly: true,
        description: 'Não usar como custo real.',
      },
    },
    {
      name: 'futureTokenPlaceholder',
      type: 'number',
      label: 'Tokens futuros (placeholder)',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Placeholder tipado — não reflete uso real.',
      },
    },
  ],
};
