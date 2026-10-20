import type { CollectionConfig } from 'payload';

import { academicAdminDeleteAccess, academicAdminWriteAccess } from '../../access/lms-academic';
import { isPlatformAdmin, isSuperAdmin } from '../../access/rbac';
import { ilsGroup, schoolKeyField } from './fields';

export const IlsCompetencyHistory: CollectionConfig = {
  slug: 'ils-competency-history',
  labels: { singular: 'Histórico de competência', plural: 'Históricos de competência' },
  admin: {
    useAsTitle: 'competencyKey',
    defaultColumns: ['student', 'competencyKey', 'score', 'snapshotAt'],
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
    { name: 'student', type: 'relationship', relationTo: 'users', required: true, index: true },
    schoolKeyField,
    { name: 'competencyKey', type: 'text', required: true, index: true },
    { name: 'score', type: 'number', required: true },
    { name: 'confidence', type: 'number', defaultValue: 0 },
    { name: 'evidenceCount', type: 'number', defaultValue: 1 },
    { name: 'sourceEvent', type: 'text' },
    { name: 'previousScore', type: 'number' },
    { name: 'snapshotAt', type: 'date', required: true },
  ],
};
