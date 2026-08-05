import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';
import { KI_QUEUE_STATUSES } from '@omnia/knowledge-intelligence';

function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

/**
 * Fila de embeddings — apenas estados. Nenhum provider/SDK nesta entrega.
 */
export const EmbeddingQueue: CollectionConfig = {
  slug: 'embedding-queue',
  labels: {
    singular: 'Queue Item',
    plural: 'Queue',
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['status', 'learningResource', 'knowledgeDocument', 'attempts', 'updatedAt'],
    group: 'Knowledge Intelligence',
    description: 'Fila de embeddings futuros. Status only — sem DeepSeek/OpenAI/vector DB.',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiStaffAccess,
    update: kiStaffAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    {
      name: 'learningResource',
      type: 'relationship',
      relationTo: 'learning-resources',
      required: true,
      index: true,
      label: 'Learning Resource',
    },
    {
      name: 'knowledgeDocument',
      type: 'relationship',
      relationTo: 'knowledge-documents',
      index: true,
      label: 'Knowledge Document',
    },
    {
      name: 'chunk',
      type: 'relationship',
      relationTo: 'knowledge-chunks',
      index: true,
      label: 'Chunk (opcional)',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: optionsFrom(KI_QUEUE_STATUSES),
      label: 'Status',
    },
    {
      name: 'attempts',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'Tentativas',
    },
    {
      name: 'provider',
      type: 'text',
      defaultValue: 'none',
      label: 'Provider',
      admin: { description: 'Sempre none até GO de embeddings.' },
    },
    {
      name: 'lastError',
      type: 'textarea',
      label: 'Erro sanitizado',
    },
    {
      name: 'scheduledAt',
      type: 'date',
      label: 'Agendado em',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'completedAt',
      type: 'date',
      label: 'Concluído em',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
};
