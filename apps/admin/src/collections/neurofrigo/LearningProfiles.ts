import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

/**
 * LearningProfile — indicadores de aprendizagem atualizados automaticamente.
 */
export const LearningProfiles: CollectionConfig = {
  slug: 'learning-profiles',
  labels: { singular: 'Learning Profile', plural: 'Learning Profiles' },
  admin: {
    useAsTitle: 'userKey',
    defaultColumns: ['userKey', 'course', 'level', 'aiUsageCount', 'updatedAt'],
    group: 'Neurofrigo Tutor',
    description: 'Nível estimado, tópicos e sinais de lacunas (por curso).',
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
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      index: true,
      label: 'Curso',
    },
    {
      name: 'level',
      type: 'select',
      required: true,
      defaultValue: 'beginner',
      index: true,
      options: [
        { label: 'Iniciante', value: 'beginner' },
        { label: 'Intermediário', value: 'intermediate' },
        { label: 'Avançado', value: 'advanced' },
        { label: 'Especialista', value: 'specialist' },
      ],
    },
    { name: 'masteredTopics', type: 'json', label: 'Assuntos dominados' },
    { name: 'pendingTopics', type: 'json', label: 'Assuntos pendentes' },
    { name: 'reviewedTopics', type: 'json', label: 'Tópicos revisados' },
    { name: 'difficultyTopics', type: 'json', label: 'Tópicos com dificuldade' },
    {
      name: 'aiUsageCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'Frequência de uso da IA',
    },
    { name: 'avgGrounding', type: 'number', defaultValue: 0, label: 'Grounding médio' },
    {
      name: 'negativeFeedbackCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'Feedbacks negativos',
    },
    { name: 'repeatedQuestions', type: 'json', label: 'Perguntas repetidas' },
    { name: 'gaps', type: 'json', label: 'Lacunas detectadas' },
  ],
};
