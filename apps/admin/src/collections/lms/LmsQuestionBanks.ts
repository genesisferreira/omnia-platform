import type { CollectionConfig } from 'payload';

import {
  academicAdminDeleteAccess,
  academicAdminReadAccess,
  academicAdminWriteAccess,
} from '../../access/lms-academic';

export const LmsQuestionBanks: CollectionConfig = {
  slug: 'lms-question-banks',
  labels: { singular: 'Banco de questões', plural: 'Bancos de questões' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'course', 'updatedAt'],
    group: 'LMS Acadêmico',
  },
  timestamps: true,
  access: {
    read: academicAdminReadAccess,
    create: academicAdminWriteAccess,
    update: academicAdminWriteAccess,
    delete: academicAdminDeleteAccess,
  },
  fields: [
    { name: 'title', type: 'text', required: true, index: true },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      index: true,
    },
    {
      name: 'instructor',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'ownerCompany',
      type: 'relationship',
      relationTo: 'companies',
      index: true,
    },
    { name: 'description', type: 'textarea' },
  ],
};
