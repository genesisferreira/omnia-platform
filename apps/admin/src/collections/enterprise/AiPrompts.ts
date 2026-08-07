import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

export const AiPrompts: CollectionConfig = {
  slug: 'ai-prompts',
  labels: { singular: 'AI Prompt', plural: 'AI Prompts' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['assistant', 'kind', 'version', 'active', 'updatedAt'],
    group: 'Enterprise AI',
    description: 'Prompt Registry versionado (system/security/style/domain).',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiPublisherAccess,
    update: kiPublisherAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'assistant',
      type: 'relationship',
      relationTo: 'ai-assistants',
      required: true,
      index: true,
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'System', value: 'system' },
        { label: 'Security', value: 'security' },
        { label: 'Style', value: 'style' },
        { label: 'Domain', value: 'domain' },
      ],
    },
    { name: 'version', type: 'number', required: true, defaultValue: 1, min: 1 },
    { name: 'body', type: 'textarea', required: true },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Versão ativa',
      admin: { description: 'Desative para rollback (ative versão anterior).' },
    },
    { name: 'changelog', type: 'text', label: 'Changelog' },
  ],
};
