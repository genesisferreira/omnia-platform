import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

/**
 * TutorStudyPlans — planos gerados a partir do LMS existente (sem criar conteúdo).
 */
export const TutorStudyPlans: CollectionConfig = {
  slug: 'tutor-study-plans',
  labels: { singular: 'Plano de Estudo', plural: 'Planos de Estudo' },
  admin: {
    useAsTitle: 'objective',
    defaultColumns: ['objective', 'course', 'estimatedLessons', 'createdAt'],
    group: 'Neurofrigo Tutor',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiStaffAccess,
    update: kiStaffAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    { name: 'objective', type: 'textarea', required: true, label: 'Objetivo' },
    {
      name: 'userKey',
      type: 'text',
      required: true,
      index: true,
      label: 'User key',
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      index: true,
    },
    { name: 'steps', type: 'json', required: true, label: 'Passos (LMS)' },
    {
      name: 'estimatedLessons',
      type: 'number',
      defaultValue: 0,
      label: 'Aulas estimadas',
    },
  ],
};
