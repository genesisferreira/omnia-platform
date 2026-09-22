import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';
import { KI_RUN_STATUSES } from '@omnia/knowledge-intelligence';

function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

/** Execuções do pipeline (observabilidade). */
export const KiProcessingRuns: CollectionConfig = {
  slug: 'ki-processing-runs',
  labels: {
    singular: 'Processing Run',
    plural: 'Processing',
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['learningResource', 'status', 'chunkCount', 'startedAt', 'finishedAt'],
    group: 'Knowledge Intelligence',
    description: 'Histórico de corridas extract→normalize→chunk→hub→queue.',
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
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: optionsFrom(KI_RUN_STATUSES),
      label: 'Status',
    },
    {
      name: 'stages',
      type: 'json',
      label: 'Estágios',
      admin: { description: 'Mapa stage→status/timestamps.' },
    },
    {
      name: 'chunkCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'Chunks gerados',
    },
    {
      name: 'correlationId',
      type: 'text',
      index: true,
      label: 'Correlation ID',
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
  ],
};
