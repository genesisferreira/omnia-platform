import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

export const SipEvidence: CollectionConfig = {
  slug: 'sip-evidence',
  labels: { singular: 'SIP Evidence', plural: 'SIP Evidence' },
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['userKey', 'sourceType', 'competencyKey', 'strength', 'createdAt'],
    group: 'Student Intelligence',
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
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      index: true,
    },
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      options: [
        { label: 'Tutor', value: 'tutor' },
        { label: 'LMS', value: 'lms' },
        { label: 'Assessment', value: 'assessment' },
        { label: 'Exercise', value: 'exercise' },
        { label: 'Study time', value: 'study_time' },
        { label: 'Question', value: 'question' },
        { label: 'Attempt', value: 'attempt' },
        { label: 'Feedback', value: 'feedback' },
        { label: 'Engineering', value: 'engineering' },
        { label: 'Commercial', value: 'commercial' },
      ],
    },
    { name: 'sourceId', type: 'text' },
    { name: 'competencyKey', type: 'text', index: true },
    { name: 'strength', type: 'number', required: true, defaultValue: 0 },
    { name: 'confidence', type: 'number', required: true, defaultValue: 0 },
    { name: 'summary', type: 'text', required: true },
    { name: 'payload', type: 'json' },
    {
      name: 'observedAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
};
