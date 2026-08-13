import type { CollectionConfig } from 'payload';

import { isPlatformAdmin, isSuperAdmin } from '../../access/rbac';
import { academicAdminDeleteAccess, academicAdminWriteAccess } from '../../access/lms-academic';
import { NOTIFICATION_TYPES, optionsFrom } from './constants';

export const LmsNotifications: CollectionConfig = {
  slug: 'lms-notifications',
  labels: { singular: 'Notificação LMS', plural: 'Notificações LMS' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'recipient', 'read', 'createdAt'],
    group: 'LMS Acadêmico',
  },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isPlatformAdmin(user) || isSuperAdmin(user)) return true;
      return { recipient: { equals: user.id } };
    },
    create: academicAdminWriteAccess,
    update: academicAdminWriteAccess,
    delete: academicAdminDeleteAccess,
  },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: optionsFrom(NOTIFICATION_TYPES),
    },
    { name: 'title', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    { name: 'href', type: 'text' },
    { name: 'read', type: 'checkbox', defaultValue: false, index: true },
    { name: 'readAt', type: 'date' },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
    },
  ],
};
