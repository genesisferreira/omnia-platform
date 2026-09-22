import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

export const SipProfiles: CollectionConfig = {
  slug: 'sip-profiles',
  labels: { singular: 'SIP Profile', plural: 'SIP Profiles' },
  admin: {
    useAsTitle: 'userKey',
    defaultColumns: ['userKey', 'course', 'technicalLevel', 'updatedAt'],
    group: 'Student Intelligence',
    description: 'Digital Twin educacional — fonte oficial do perfil do aluno.',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiPublisherAccess,
    update: kiPublisherAccess,
    delete: kiPublisherAccess,
  },
  fields: [
    { name: 'userKey', type: 'text', required: true, index: true },
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
      index: true,
    },
    { name: 'language', type: 'text', defaultValue: 'pt-BR' },
    { name: 'technicalLevel', type: 'text', defaultValue: 'beginner' },
    { name: 'progressPercent', type: 'number', defaultValue: 0 },
    { name: 'studyTimeMinutes', type: 'number', defaultValue: 0 },
    {
      name: 'competencies',
      type: 'json',
      label: 'Competências',
    },
    {
      name: 'objectives',
      type: 'json',
      label: 'Objetivos (editáveis pelo aluno)',
    },
    {
      name: 'preferences',
      type: 'json',
      label: 'Preferências inferidas',
    },
    {
      name: 'recommendations',
      type: 'json',
      label: 'Recomendações',
    },
    {
      name: 'insights',
      type: 'json',
      label: 'Insights (admin)',
    },
    {
      name: 'evidenceSummary',
      type: 'json',
    },
    {
      name: 'history',
      type: 'json',
    },
    {
      name: 'assistantContext',
      type: 'textarea',
      label: 'Contexto para assistentes',
      admin: { readOnly: true },
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 1,
    },
    {
      name: 'lastRecalculatedAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' }, readOnly: true },
    },
  ],
};
