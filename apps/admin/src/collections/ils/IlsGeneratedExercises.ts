import type { CollectionConfig } from 'payload';

import {
  academicAdminDeleteAccess,
  academicAdminReadAccess,
  academicAdminWriteAccess,
} from '../../access/lms-academic';
import { ilsGroup, optionsFrom, schoolKeyField } from './fields';

export const IlsGeneratedExercises: CollectionConfig = {
  slug: 'ils-generated-exercises',
  labels: { singular: 'Exercício gerado', plural: 'Exercícios gerados' },
  admin: {
    useAsTitle: 'prompt',
    defaultColumns: ['status', 'type', 'schoolKey', 'updatedAt'],
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
    schoolKeyField,
    { name: 'course', type: 'relationship', relationTo: 'courses' },
    { name: 'lesson', type: 'relationship', relationTo: 'lessons' },
    { name: 'student', type: 'relationship', relationTo: 'users' },
    { name: 'instructor', type: 'relationship', relationTo: 'users' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'GENERATED',
      index: true,
      options: optionsFrom(['GENERATED', 'VALIDATED', 'AVAILABLE', 'REJECTED']),
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'multiple_choice',
      options: optionsFrom([
        'multiple_choice',
        'true_false',
        'short_answer',
        'diagnostic_case',
        'calculation',
      ]),
    },
    {
      name: 'difficulty',
      type: 'select',
      options: optionsFrom(['beginner', 'intermediate', 'advanced']),
    },
    { name: 'prompt', type: 'textarea', required: true },
    { name: 'expectedAnswer', type: 'textarea' },
    { name: 'rubric', type: 'textarea' },
    { name: 'explanation', type: 'textarea' },
    { name: 'competencies', type: 'json' },
    { name: 'sourceRefs', type: 'json' },
    { name: 'generationMetadata', type: 'json' },
    { name: 'validatedBy', type: 'relationship', relationTo: 'users' },
    { name: 'validatedAt', type: 'date' },
  ],
};
