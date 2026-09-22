import type { CollectionConfig } from 'payload';

import {
  academicAdminDeleteAccess,
  academicAdminReadAccess,
  academicAdminWriteAccess,
} from '../../access/lms-academic';
import { QUESTION_DIFFICULTIES, QUESTION_TYPES, optionsFrom } from './constants';

export const LmsQuestions: CollectionConfig = {
  slug: 'lms-questions',
  labels: { singular: 'Questão', plural: 'Questões' },
  admin: {
    useAsTitle: 'prompt',
    defaultColumns: ['prompt', 'type', 'difficulty', 'updatedAt'],
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
    { name: 'prompt', type: 'textarea', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'multiple_choice',
      index: true,
      options: optionsFrom(QUESTION_TYPES),
    },
    {
      name: 'bank',
      type: 'relationship',
      relationTo: 'lms-question-banks',
      index: true,
    },
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
    {
      name: 'difficulty',
      type: 'select',
      defaultValue: 'beginner',
      options: optionsFrom(QUESTION_DIFFICULTIES),
    },
    { name: 'competencyKey', type: 'text', index: true, label: 'Competência' },
    {
      name: 'options',
      type: 'json',
      label: 'Opções / gabarito (JSON interno)',
      admin: {
        description:
          '{ choices: [{id,label,correct?}], answer?: string, acceptable?: string[] } — nunca expor gabarito ao aluno em avaliação ativa.',
      },
    },
    { name: 'points', type: 'number', defaultValue: 1, min: 0 },
    { name: 'version', type: 'number', defaultValue: 1 },
  ],
};
