import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

export const AiPrompts: CollectionConfig = {
  slug: 'ai-prompts',
  labels: { singular: 'AI Prompt', plural: 'AI Prompts' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['assistant', 'kind', 'version', 'status', 'active', 'updatedAt'],
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
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        if (data.status === 'active') data.active = true;
        if (data.status === 'retired' || data.status === 'draft') data.active = false;
        if (data.active === true && !data.status) data.status = 'active';
        if (data.active === false && data.status === 'active') data.status = 'retired';
        return data;
      },
    ],
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
        { label: 'Compliance', value: 'compliance' },
      ],
    },
    { name: 'version', type: 'number', required: true, defaultValue: 1, min: 1 },
    { name: 'body', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Retired', value: 'retired' },
      ],
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Versão ativa',
      admin: { description: 'Desative para rollback (ative versão anterior).' },
    },
    { name: 'author', type: 'text', label: 'Autor' },
    { name: 'changelog', type: 'text', label: 'Changelog' },
  ],
};
