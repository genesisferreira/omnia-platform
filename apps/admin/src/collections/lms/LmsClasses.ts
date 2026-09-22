import type { CollectionConfig } from 'payload';

import {
  academicAdminDeleteAccess,
  academicAdminReadAccess,
  academicAdminWriteAccess,
} from '../../access/lms-academic';
import { CLASS_MODALITIES, CLASS_STATUSES, optionsFrom } from './constants';

export const LmsClasses: CollectionConfig = {
  slug: 'lms-classes',
  labels: { singular: 'Turma', plural: 'Turmas' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'course', 'status', 'startsAt', 'updatedAt'],
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
    { name: 'name', type: 'text', required: true, index: true, label: 'Nome' },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      index: true,
      label: 'Curso',
    },
    {
      name: 'instructor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Professor responsável',
    },
    {
      name: 'ownerCompany',
      type: 'relationship',
      relationTo: 'companies',
      index: true,
      label: 'Empresa',
    },
    {
      name: 'schoolKey',
      type: 'select',
      index: true,
      label: 'Escola',
      options: [
        { label: 'Fred do Frio', value: 'fred-do-frio' },
        { label: 'CTE', value: 'cte' },
      ],
    },
    {
      name: 'startsAt',
      type: 'date',
      label: 'Início',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'endsAt',
      type: 'date',
      label: 'Fim',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      index: true,
      options: optionsFrom(CLASS_STATUSES),
    },
    { name: 'capacity', type: 'number', min: 1, label: 'Capacidade' },
    {
      name: 'modality',
      type: 'select',
      defaultValue: 'online',
      options: optionsFrom(CLASS_MODALITIES),
    },
  ],
};
