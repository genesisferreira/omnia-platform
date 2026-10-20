import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

export const AiFeedback: CollectionConfig = {
  slug: 'ai-feedback',
  labels: {
    singular: 'AI Feedback',
    plural: 'AI Feedback',
  },
  admin: {
    useAsTitle: 'rating',
    defaultColumns: ['rating', 'aiSession', 'comment', 'createdAt'],
    group: 'Neurofrigo AI',
    description: 'Avaliação 👍/👎 das respostas do Assistente Técnico.',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: () => true,
    update: kiStaffAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    {
      name: 'aiSession',
      type: 'relationship',
      relationTo: 'ai-sessions',
      required: true,
      index: true,
      label: 'AI Session',
    },
    {
      name: 'rating',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Útil', value: 'up' },
        { label: 'Não ajudou', value: 'down' },
      ],
      label: 'Avaliação',
    },
    {
      name: 'comment',
      type: 'textarea',
      label: 'O que estava faltando?',
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      label: 'Usuário',
    },
  ],
};
