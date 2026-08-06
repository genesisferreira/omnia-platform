import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

/**
 * AISession — sessão temporária com turns (sem memória entre sessões).
 */
export const AiSessions: CollectionConfig = {
  slug: 'ai-sessions',
  labels: {
    singular: 'AI Session',
    plural: 'AI Sessions',
  },
  admin: {
    useAsTitle: 'question',
    defaultColumns: [
      'question',
      'status',
      'intent',
      'groundingScore',
      'tookMs',
      'updatedAt',
    ],
    group: 'Neurofrigo AI',
    description:
      'Sessão de conversa temporária (turns + grounding). Sem memória permanente entre sessões.',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiStaffAccess,
    update: kiStaffAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    { name: 'question', type: 'textarea', required: true, label: 'Última pergunta' },
    { name: 'answerText', type: 'textarea', label: 'Última resposta' },
    { name: 'formattedAnswer', type: 'textarea', label: 'Resposta formatada' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'ok',
      index: true,
      options: [
        { label: 'OK', value: 'ok' },
        { label: 'Não encontrado', value: 'not_found' },
        { label: 'Erro', value: 'error' },
        { label: 'Timeout', value: 'timeout' },
      ],
    },
    { name: 'intent', type: 'text', index: true, label: 'Intenção' },
    { name: 'provider', type: 'text', required: true, label: 'Provider' },
    { name: 'model', type: 'text', required: true, label: 'Modelo' },
    { name: 'tookMs', type: 'number', required: true, min: 0, label: 'Tempo total (ms)' },
    { name: 'retrievalTookMs', type: 'number', defaultValue: 0, label: 'Tempo retrieval (ms)' },
    { name: 'llmTookMs', type: 'number', defaultValue: 0, label: 'Tempo LLM (ms)' },
    { name: 'promptTokens', type: 'number', defaultValue: 0, label: 'Prompt tokens' },
    { name: 'completionTokens', type: 'number', defaultValue: 0, label: 'Completion tokens' },
    { name: 'totalTokens', type: 'number', defaultValue: 0, label: 'Total tokens' },
    { name: 'estimatedCostUsd', type: 'number', defaultValue: 0, label: 'Custo estimado USD' },
    { name: 'confidence', type: 'number', defaultValue: 0, label: 'Confiança' },
    { name: 'groundingScore', type: 'number', defaultValue: 0, label: 'Grounding Score' },
    { name: 'errorCode', type: 'text', label: 'Código de erro' },
    { name: 'sources', type: 'json', label: 'Últimas citações' },
    { name: 'explainability', type: 'json', label: 'Explainability' },
    { name: 'grounding', type: 'json', label: 'Grounding detalhado' },
    {
      name: 'turns',
      type: 'json',
      label: 'Turnos da sessão',
      admin: { description: 'Histórico temporário Q/A desta sessão apenas.' },
    },
    { name: 'filters', type: 'json', label: 'Contexto / filtros' },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      label: 'Usuário',
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      index: true,
      label: 'Tenant',
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      index: true,
      label: 'Curso',
    },
    {
      name: 'module',
      type: 'relationship',
      relationTo: 'course-modules',
      index: true,
      label: 'Módulo',
    },
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      index: true,
      label: 'Aula',
    },
    {
      name: 'ownerCompany',
      type: 'relationship',
      relationTo: 'companies',
      index: true,
      label: 'Empresa',
    },
  ],
};
