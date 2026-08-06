import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

/**
 * AISession — telemetria de uma pergunta ao Runtime (sem memória entre conversas).
 */
export const AiSessions: CollectionConfig = {
  slug: 'ai-sessions',
  labels: {
    singular: 'AI Session',
    plural: 'AI Sessions',
  },
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'status', 'provider', 'tookMs', 'totalTokens', 'createdAt'],
    group: 'Neurofrigo AI',
    description: 'Sessões independentes do Runtime MVP. Sem memória persistente.',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiStaffAccess,
    update: kiStaffAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    { name: 'question', type: 'textarea', required: true, label: 'Pergunta' },
    { name: 'answerText', type: 'textarea', label: 'Resposta' },
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
    { name: 'provider', type: 'text', required: true, label: 'Provider' },
    { name: 'model', type: 'text', required: true, label: 'Modelo' },
    { name: 'tookMs', type: 'number', required: true, min: 0, label: 'Tempo (ms)' },
    { name: 'promptTokens', type: 'number', defaultValue: 0, label: 'Prompt tokens' },
    { name: 'completionTokens', type: 'number', defaultValue: 0, label: 'Completion tokens' },
    { name: 'totalTokens', type: 'number', defaultValue: 0, label: 'Total tokens' },
    { name: 'estimatedCostUsd', type: 'number', defaultValue: 0, label: 'Custo estimado USD' },
    { name: 'confidence', type: 'number', defaultValue: 0, label: 'Confiança' },
    { name: 'errorCode', type: 'text', label: 'Código de erro' },
    { name: 'sources', type: 'json', label: 'Fontes' },
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
