import type { CollectionConfig } from 'payload';

import {
  academicAdminDeleteAccess,
  academicAdminReadAccess,
  academicAdminWriteAccess,
} from '../../access/lms-academic';
import { ilsGroup, optionsFrom, schoolKeyField } from './fields';

export const IlsInterventions: CollectionConfig = {
  slug: 'ils-interventions',
  labels: { singular: 'Intervenção pedagógica', plural: 'Intervenções pedagógicas' },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['student', 'action', 'schoolKey', 'createdAt'],
    group: ilsGroup,
  },
  timestamps: true,
  access: {
    read: academicAdminReadAccess,
    create: academicAdminWriteAccess,
    update: academicAdminWriteAccess,
    delete: academicAdminDeleteAccess,
  },
  fields: [
    { name: 'actor', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'student', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'course', type: 'relationship', relationTo: 'courses' },
    { name: 'classRef', type: 'relationship', relationTo: 'lms-classes' },
    schoolKeyField,
    { name: 'reason', type: 'textarea', required: true },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: optionsFrom([
        'observation',
        'recommend_content',
        'assign_exercise',
        'request_review',
        'request_contact',
        'follow_up',
        'other',
      ]),
    },
    { name: 'outcome', type: 'textarea' },
    { name: 'suggestedByAi', type: 'checkbox', defaultValue: false },
  ],
};
