import type { CollectionConfig } from 'payload';

import { isPlatformAdmin, isSuperAdmin } from '../../access/rbac';
import { academicAdminDeleteAccess, academicAdminWriteAccess } from '../../access/lms-academic';

export const LmsLessonProgress: CollectionConfig = {
  slug: 'lms-lesson-progress',
  labels: { singular: 'Progresso de aula', plural: 'Progresso de aulas' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['student', 'lesson', 'completed', 'updatedAt'],
    group: 'LMS Acadêmico',
  },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isPlatformAdmin(user) || isSuperAdmin(user)) return true;
      if (user.role === 'instructor') return false;
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
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      index: true,
    },
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      required: true,
      index: true,
    },
    { name: 'startedAt', type: 'date' },
    { name: 'completedAt', type: 'date' },
    { name: 'completed', type: 'checkbox', defaultValue: false, index: true },
    { name: 'secondsSpent', type: 'number', min: 0, defaultValue: 0 },
  ],
};
