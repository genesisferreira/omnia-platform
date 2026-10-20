import type { CollectionConfig } from 'payload';

import { academicAdminDeleteAccess, academicAdminReadAccess } from '../../access/lms-academic';
import { ilsGroup, schoolKeyField } from './fields';

export const IlsAuditEvents: CollectionConfig = {
  slug: 'ils-audit-events',
  labels: { singular: 'Auditoria ILS', plural: 'Auditorias ILS' },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'actor', 'student', 'createdAt'],
    group: ilsGroup,
  },
  timestamps: true,
  access: {
    read: academicAdminReadAccess,
    create: ({ req: { user } }) => Boolean(user),
    update: () => false,
    delete: academicAdminDeleteAccess,
  },
  fields: [
    { name: 'actor', type: 'relationship', relationTo: 'users', index: true },
    { name: 'student', type: 'relationship', relationTo: 'users', index: true },
    schoolKeyField,
    { name: 'action', type: 'text', required: true, index: true },
    { name: 'reason', type: 'textarea' },
    { name: 'source', type: 'text' },
    { name: 'previousJson', type: 'json' },
    { name: 'nextJson', type: 'json' },
  ],
};
