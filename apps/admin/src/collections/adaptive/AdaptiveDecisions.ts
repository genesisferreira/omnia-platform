import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

export const AdaptiveDecisions: CollectionConfig = {
  slug: 'adaptive-decisions',
  labels: { singular: 'Adaptive Decision', plural: 'Adaptive Decisions' },
  admin: {
    useAsTitle: 'actionType',
    defaultColumns: ['userKey', 'actionType', 'priority', 'confidence', 'createdAt'],
    group: 'Adaptive Learning',
    description: 'Auditoria de Next Best Learning Action (determinística).',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiPublisherAccess,
    update: () => false,
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
    { name: 'tenantKey', type: 'text', index: true },
    {
      name: 'actionType',
      type: 'select',
      required: true,
      options: [
        { label: 'Continue lesson', value: 'CONTINUE_LESSON' },
        { label: 'Review lesson', value: 'REVIEW_LESSON' },
        { label: 'Review topic', value: 'REVIEW_TOPIC' },
        { label: 'Next module', value: 'NEXT_MODULE' },
        { label: 'Practice', value: 'PRACTICE' },
        { label: 'Assessment', value: 'ASSESSMENT' },
        { label: 'Revisit content', value: 'REVISIT_CONTENT' },
        { label: 'Ask tutor', value: 'ASK_TUTOR' },
      ],
    },
    { name: 'reason', type: 'textarea', required: true },
    { name: 'reasonFriendly', type: 'textarea' },
    { name: 'priority', type: 'number', defaultValue: 0 },
    { name: 'confidence', type: 'number', defaultValue: 0 },
    { name: 'moduleId', type: 'text' },
    { name: 'lessonId', type: 'text' },
    { name: 'lessonSlug', type: 'text' },
    { name: 'lessonTitle', type: 'text' },
    { name: 'competencyIds', type: 'json' },
    { name: 'evidenceIds', type: 'json' },
    { name: 'factors', type: 'json' },
    { name: 'plan', type: 'json' },
    { name: 'policyKey', type: 'text' },
    { name: 'policyVersion', type: 'text' },
    {
      name: 'outcome',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Ignored', value: 'ignored' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    {
      name: 'decidedAt',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
};
