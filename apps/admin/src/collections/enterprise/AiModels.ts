import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

export const AiModels: CollectionConfig = {
  slug: 'ai-models',
  labels: { singular: 'AI Model', plural: 'AI Models' },
  admin: {
    useAsTitle: 'key',
    defaultColumns: ['key', 'provider', 'model', 'status', 'priority'],
    group: 'Enterprise AI',
    description: 'Model Registry — providers e custos estimados.',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiPublisherAccess,
    update: kiPublisherAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'provider', type: 'text', required: true },
    { name: 'model', type: 'text', required: true },
    {
      name: 'estimatedCostPer1kTokens',
      type: 'number',
      defaultValue: 0,
      label: 'Custo estimado / 1k tokens',
    },
    {
      name: 'maxContextTokens',
      type: 'number',
      defaultValue: 8000,
      label: 'Contexto máximo',
    },
    { name: 'capabilities', type: 'json', label: 'Capacidades' },
    {
      name: 'defaultTemperature',
      type: 'number',
      defaultValue: 0.2,
      label: 'Temperatura padrão',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Disabled', value: 'disabled' },
      ],
    },
    { name: 'priority', type: 'number', defaultValue: 10, label: 'Prioridade' },
  ],
};
