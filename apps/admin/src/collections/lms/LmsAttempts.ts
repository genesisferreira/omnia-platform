import type { CollectionConfig, Where } from 'payload';

import { isPlatformAdmin, isSuperAdmin } from '../../access/rbac';
import { academicAdminDeleteAccess, academicAdminWriteAccess } from '../../access/lms-academic';
import { ATTEMPT_STATUSES, optionsFrom } from './constants';

export const LmsAttempts: CollectionConfig = {
  slug: 'lms-attempts',
  labels: { singular: 'Tentativa', plural: 'Tentativas' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['student', 'assessment', 'status', 'score', 'updatedAt'],
    group: 'LMS Acadêmico',
  },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isPlatformAdmin(user) || isSuperAdmin(user)) return true;
      if (user.role === 'instructor') {
        return { instructor: { equals: user.id } } as Where;
      }
      return { student: { equals: user.id } } as Where;
    },
    create: academicAdminWriteAccess,
    update: academicAdminWriteAccess,
    delete: academicAdminDeleteAccess,
  },
  fields: [
    {
      name: 'assessment',
      type: 'relationship',
      relationTo: 'lms-assessments',
      required: true,
      index: true,
    },
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
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
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'in_progress',
      index: true,
      options: optionsFrom(ATTEMPT_STATUSES),
    },
    { name: 'attemptNumber', type: 'number', required: true, defaultValue: 1 },
    {
      name: 'answers',
      type: 'json',
      label: 'Respostas (JSON) — ACL: aluno só vê as próprias',
    },
    { name: 'score', type: 'number', min: 0, max: 100 },
    { name: 'maxScore', type: 'number' },
    { name: 'feedback', type: 'textarea' },
    { name: 'startedAt', type: 'date' },
    { name: 'submittedAt', type: 'date' },
    { name: 'gradedAt', type: 'date' },
    { name: 'publishedAt', type: 'date' },
    { name: 'needsManualGrade', type: 'checkbox', defaultValue: false },
  ],
};
