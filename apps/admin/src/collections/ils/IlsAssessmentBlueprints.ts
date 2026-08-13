import type { CollectionConfig } from 'payload';

import {
  academicAdminDeleteAccess,
  academicAdminReadAccess,
  academicAdminWriteAccess,
} from '../../access/lms-academic';
import { ilsGroup, schoolKeyField } from './fields';

export const IlsAssessmentBlueprints: CollectionConfig = {
  slug: 'ils-assessment-blueprints',
  labels: { singular: 'Blueprint de avaliação', plural: 'Blueprints de avaliação' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'version', 'schoolKey', 'updatedAt'],
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
    { name: 'title', type: 'text', required: true },
    { name: 'version', type: 'text', required: true, defaultValue: 'v1' },
    schoolKeyField,
    { name: 'course', type: 'relationship', relationTo: 'courses' },
    { name: 'instructor', type: 'relationship', relationTo: 'users' },
    { name: 'official', type: 'checkbox', defaultValue: true },
    { name: 'competencies', type: 'json' },
    { name: 'difficulty', type: 'json' },
    { name: 'questionCount', type: 'number', defaultValue: 10 },
    { name: 'timeLimitMinutes', type: 'number', defaultValue: 40 },
    { name: 'passingScore', type: 'number', defaultValue: 70 },
    { name: 'allowedTypes', type: 'json' },
  ],
};
