import type { CollectionConfig } from 'payload';

import { academicAdminDeleteAccess, academicAdminWriteAccess } from '../../access/lms-academic';
import { isPlatformAdmin, isSuperAdmin } from '../../access/rbac';
import { ilsGroup, optionsFrom, schoolKeyField } from './fields';

export const IlsOnboarding: CollectionConfig = {
  slug: 'ils-onboarding',
  labels: { singular: 'Onboarding ILS', plural: 'Onboardings ILS' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['student', 'schoolKey', 'status', 'updatedAt'],
    group: ilsGroup,
  },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isPlatformAdmin(user) || isSuperAdmin(user) || user.role === 'instructor') return true;
      return { student: { equals: user.id } };
    },
    create: academicAdminWriteAccess,
    update: academicAdminWriteAccess,
    delete: academicAdminDeleteAccess,
  },
  fields: [
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    schoolKeyField,
    {
      name: 'ownerCompany',
      type: 'relationship',
      relationTo: 'companies',
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'NOT_STARTED',
      index: true,
      options: optionsFrom([
        'NOT_STARTED',
        'IN_PROGRESS',
        'COMPLETED',
        'REVIEW_REQUIRED',
        'EXEMPTED',
      ]),
    },
    { name: 'currentStep', type: 'text', defaultValue: 'explanation' },
    { name: 'pcar', type: 'json' },
    { name: 'goals', type: 'json' },
    { name: 'assessmentState', type: 'json' },
    { name: 'consentId', type: 'number' },
    { name: 'completedAt', type: 'date' },
    { name: 'exemptedBy', type: 'relationship', relationTo: 'users' },
    { name: 'exemptedReason', type: 'textarea' },
    { name: 'exemptedAt', type: 'date' },
  ],
};
