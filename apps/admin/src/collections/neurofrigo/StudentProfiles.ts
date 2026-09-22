import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

/**
 * StudentProfile — snapshot derivado do LMS (não é fonte de verdade de matrícula).
 */
export const StudentProfiles: CollectionConfig = {
  slug: 'student-profiles',
  labels: { singular: 'Student Profile', plural: 'Student Profiles' },
  admin: {
    useAsTitle: 'userKey',
    defaultColumns: ['userKey', 'course', 'progressPercent', 'studyTimeMinutes', 'updatedAt'],
    group: 'Neurofrigo Tutor',
    description: 'Perfil do aluno derivado do LMS Core / progresso observado.',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiStaffAccess,
    update: kiStaffAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    { name: 'userKey', type: 'text', required: true, index: true, label: 'User key' },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      label: 'Usuário',
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      index: true,
      label: 'Tenant',
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
      name: 'enrolledCourseIds',
      type: 'json',
      label: 'Cursos matriculados (derivado)',
    },
    {
      name: 'progressPercent',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      max: 100,
      label: 'Progresso %',
    },
    { name: 'completedModuleIds', type: 'json', label: 'Módulos concluídos' },
    { name: 'completedLessonIds', type: 'json', label: 'Aulas concluídas' },
    { name: 'lastActivityAt', type: 'date', label: 'Última atividade' },
    {
      name: 'studyTimeMinutes',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'Tempo estudado (min)',
    },
    {
      name: 'language',
      type: 'text',
      defaultValue: 'pt-BR',
      label: 'Idioma',
    },
    {
      name: 'source',
      type: 'text',
      defaultValue: 'lms-derived',
      label: 'Fonte',
      admin: { readOnly: true },
    },
  ],
};
