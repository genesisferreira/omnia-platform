import type { CollectionConfig } from 'payload';

import {
  academicAdminDeleteAccess,
  academicAdminReadAccess,
  academicAdminWriteAccess,
} from '../../access/lms-academic';
import { ACADEMIC_EVENT_TYPES, optionsFrom } from './constants';

export const LmsAcademicEvents: CollectionConfig = {
  slug: 'lms-academic-events',
  labels: { singular: 'Evento acadêmico', plural: 'Eventos acadêmicos' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'startsAt', 'course'],
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
    { name: 'title', type: 'text', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'other',
      options: optionsFrom(ACADEMIC_EVENT_TYPES),
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      index: true,
    },
    {
      name: 'classRef',
      type: 'relationship',
      relationTo: 'lms-classes',
      index: true,
    },
    {
      name: 'assessment',
      type: 'relationship',
      relationTo: 'lms-assessments',
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
      name: 'startsAt',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'endsAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
};
