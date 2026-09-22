import type { CollectionConfig } from 'payload';

import {
  academicAdminDeleteAccess,
  academicAdminReadAccess,
  academicAdminWriteAccess,
} from '../../access/lms-academic';
import { ASSESSMENT_STATUSES, optionsFrom } from './constants';

export const LmsAssessments: CollectionConfig = {
  slug: 'lms-assessments',
  labels: { singular: 'Avaliação', plural: 'Avaliações' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'course', 'status', 'dueAt', 'updatedAt'],
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
    { name: 'instructions', type: 'textarea' },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      index: true,
    },
    {
      name: 'classRef',
      type: 'relationship',
      relationTo: 'lms-classes',
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
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: optionsFrom(ASSESSMENT_STATUSES),
    },
    { name: 'questionIds', type: 'json', label: 'IDs das questões (array)' },
    { name: 'timeLimitMinutes', type: 'number', min: 0 },
    { name: 'maxAttempts', type: 'number', min: 1, defaultValue: 1 },
    { name: 'passingScore', type: 'number', min: 0, max: 100, defaultValue: 70 },
    { name: 'randomize', type: 'checkbox', defaultValue: false },
    {
      name: 'opensAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'dueAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
};
