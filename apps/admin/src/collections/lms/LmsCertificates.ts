import type { CollectionConfig } from 'payload';

import { isPlatformAdmin, isSuperAdmin } from '../../access/rbac';
import { academicAdminDeleteAccess, academicAdminWriteAccess } from '../../access/lms-academic';
import { CERTIFICATE_STATUSES, optionsFrom } from './constants';

export const LmsCertificates: CollectionConfig = {
  slug: 'lms-certificates',
  labels: { singular: 'Certificado', plural: 'Certificados' },
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'student', 'course', 'status', 'issuedAt'],
    group: 'LMS Acadêmico',
  },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isPlatformAdmin(user) || isSuperAdmin(user)) return true;
      if (user.role === 'instructor') return false;
      return { student: { equals: user.id } };
    },
    create: academicAdminWriteAccess,
    update: academicAdminWriteAccess,
    delete: academicAdminDeleteAccess,
  },
  fields: [
    { name: 'code', type: 'text', required: true, unique: true, index: true },
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      index: true,
    },
    {
      name: 'enrollment',
      type: 'relationship',
      relationTo: 'lms-enrollments',
    },
    { name: 'issuer', type: 'text', defaultValue: 'Omnia Frigo — LMS' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'valid',
      options: optionsFrom(CERTIFICATE_STATUSES),
    },
    { name: 'issuedAt', type: 'date', required: true },
    { name: 'revokedAt', type: 'date' },
  ],
};
