import type { CollectionConfig } from 'payload';

import { academicAdminDeleteAccess, academicAdminWriteAccess } from '../../access/lms-academic';
import { isPlatformAdmin, isSuperAdmin } from '../../access/rbac';
import { ENROLLMENT_STATUSES, optionsFrom } from './constants';

export const LmsEnrollments: CollectionConfig = {
  slug: 'lms-enrollments',
  labels: { singular: 'Matrícula', plural: 'Matrículas' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['student', 'course', 'status', 'progressPercent', 'updatedAt'],
    group: 'LMS Acadêmico',
  },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isPlatformAdmin(user) || isSuperAdmin(user)) return true;
      if (user.role === 'instructor') return true;
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
      label: 'Aluno',
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      index: true,
      label: 'Curso',
    },
    {
      name: 'classRef',
      type: 'relationship',
      relationTo: 'lms-classes',
      index: true,
      label: 'Turma',
    },
    {
      name: 'instructor',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      label: 'Professor (denormalizado)',
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
      defaultValue: 'active',
      index: true,
      options: optionsFrom(ENROLLMENT_STATUSES),
    },
    { name: 'startedAt', type: 'date' },
    { name: 'completedAt', type: 'date' },
    { name: 'cancelledAt', type: 'date' },
    {
      name: 'progressPercent',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 0,
      label: 'Progresso %',
    },
    { name: 'lastLessonId', type: 'number', label: 'Última aula' },
  ],
};
