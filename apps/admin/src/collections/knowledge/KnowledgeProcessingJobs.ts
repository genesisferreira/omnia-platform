import type { CollectionConfig } from 'payload';

import { PROCESSING_OPERATIONS, PROCESSING_STATUSES } from '@omnia/neurofrigo-knowledge';

import {
  knowledgeCreateAccess,
  knowledgeDeleteAccess,
  knowledgeReadAccess,
  knowledgeUpdateAccess,
} from '../../access/knowledge';

function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

/**
 * Jobs de processamento futuro (extract/chunk/embed/index).
 * Default controlado — sem chamadas reais a providers.
 */
export const KnowledgeProcessingJobs: CollectionConfig = {
  slug: 'knowledge-processing-jobs',
  labels: {
    singular: 'Job de Processamento',
    plural: 'Processamentos',
  },
  admin: {
    useAsTitle: 'operation',
    defaultColumns: ['document', 'operation', 'status', 'attempt', 'provider', 'updatedAt'],
    group: 'Neurofrigo AI',
    description:
      'Fila preparatória. Operações permanecem not_implemented / controlled_mock nesta fundação.',
  },
  timestamps: true,
  access: {
    read: knowledgeReadAccess,
    create: knowledgeCreateAccess,
    update: knowledgeUpdateAccess,
    delete: knowledgeDeleteAccess,
  },
  fields: [
    {
      name: 'document',
      type: 'relationship',
      relationTo: 'knowledge-documents',
      required: true,
      index: true,
      label: 'Documento',
    },
    {
      name: 'operation',
      type: 'select',
      required: true,
      index: true,
      label: 'Operação',
      options: optionsFrom(PROCESSING_OPERATIONS),
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'not_implemented',
      index: true,
      label: 'Status',
      options: optionsFrom(PROCESSING_STATUSES),
      admin: {
        description: 'Use not_implemented ou controlled_mock. Embeddings reais são proibidos.',
      },
    },
    {
      name: 'attempt',
      type: 'number',
      label: 'Tentativa',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'provider',
      type: 'text',
      label: 'Provider (placeholder)',
      defaultValue: 'none',
    },
    {
      name: 'startedAt',
      type: 'date',
      label: 'Início',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'finishedAt',
      type: 'date',
      label: 'Fim',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'errorCode',
      type: 'text',
      label: 'Código de erro',
    },
    {
      name: 'sanitizedError',
      type: 'textarea',
      label: 'Erro sanitizado',
      admin: {
        description: 'Sem tokens, secrets ou conteúdo completo do documento.',
      },
    },
    {
      name: 'correlationId',
      type: 'text',
      label: 'Correlation ID',
      index: true,
    },
  ],
};
