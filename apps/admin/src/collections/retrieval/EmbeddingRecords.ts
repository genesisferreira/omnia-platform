import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

const EMBEDDING_STATUSES = [
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Ready', value: 'ready' },
  { label: 'Failed', value: 'failed' },
  { label: 'Stale', value: 'stale' },
];

/**
 * Metadados históricos de embeddings (vetores ficam no Vector Store).
 */
export const EmbeddingRecords: CollectionConfig = {
  slug: 'embedding-records',
  labels: {
    singular: 'Embedding Record',
    plural: 'Embedding Records',
  },
  admin: {
    useAsTitle: 'vectorId',
    defaultColumns: ['chunk', 'provider', 'model', 'status', 'dimensions', 'updatedAt'],
    group: 'Retrieval',
    description: 'Histórico de embeddings. Vetores residem no índice vetorial.',
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
      name: 'chunk',
      type: 'relationship',
      relationTo: 'knowledge-chunks',
      required: true,
      index: true,
      label: 'Chunk',
    },
    {
      name: 'knowledgeDocument',
      type: 'relationship',
      relationTo: 'knowledge-documents',
      index: true,
      label: 'Knowledge Document',
    },
    {
      name: 'learningResource',
      type: 'relationship',
      relationTo: 'learning-resources',
      index: true,
      label: 'Learning Resource',
    },
    { name: 'provider', type: 'text', required: true, index: true, label: 'Provider' },
    { name: 'model', type: 'text', required: true, label: 'Modelo' },
    { name: 'dimensions', type: 'number', required: true, label: 'Dimensões', min: 1 },
    { name: 'checksum', type: 'text', required: true, index: true, label: 'Checksum' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: EMBEDDING_STATUSES,
      label: 'Status',
    },
    { name: 'version', type: 'text', required: true, defaultValue: '1', label: 'Version' },
    { name: 'vectorId', type: 'text', index: true, label: 'Vector ID' },
    { name: 'lastError', type: 'textarea', label: 'Erro' },
  ],
};
