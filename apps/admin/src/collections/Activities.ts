import type { CollectionConfig } from 'payload';

import { adminsOnly, staffOnly } from '../access/rbac';

export const Activities: CollectionConfig = {
  slug: 'activities',
  labels: {
    singular: 'Atividade',
    plural: 'Atividades',
  },
  admin: {
    useAsTitle: 'message',
    defaultColumns: ['type', 'message', 'author', 'createdAt'],
    group: 'CRM',
    description: 'Histórico automático e comentários do CRM.',
  },
  timestamps: true,
  access: {
    read: staffOnly,
    create: staffOnly,
    update: adminsOnly,
    delete: adminsOnly,
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'comment',
      options: [
        { label: 'Criação', value: 'create' },
        { label: 'Atualização', value: 'update' },
        { label: 'Mudança de status', value: 'status_change' },
        { label: 'Comentário', value: 'comment' },
        { label: 'Lead capturado', value: 'lead_captured' },
      ],
      label: 'Tipo',
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      label: 'Mensagem',
    },
    {
      name: 'relatedTo',
      type: 'relationship',
      relationTo: ['leads', 'contacts', 'crm-companies'],
      label: 'Relacionado a',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: 'Responsável',
    },
  ],
};
