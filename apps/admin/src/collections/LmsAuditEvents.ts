import type { CollectionConfig } from 'payload';

import { adminsOnly } from '../access/rbac';

/**
 * Auditoria básica de políticas LMS e revogações de sessão.
 */
export const LmsAuditEvents: CollectionConfig = {
  slug: 'lms-audit-events',
  labels: {
    singular: 'Auditoria LMS',
    plural: 'Auditoria LMS',
  },
  admin: {
    group: 'LMS',
    useAsTitle: 'action',
    defaultColumns: ['action', 'actorId', 'targetUserId', 'createdAt'],
    description: 'Registro imutável de alterações de política e revogações.',
  },
  access: {
    read: adminsOnly,
    create: adminsOnly,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'action',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'actorId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'targetUserId',
      type: 'text',
      index: true,
    },
    {
      name: 'previousValue',
      type: 'json',
    },
    {
      name: 'newValue',
      type: 'json',
    },
    {
      name: 'reason',
      type: 'textarea',
    },
    {
      name: 'metadata',
      type: 'json',
    },
  ],
  timestamps: true,
};
