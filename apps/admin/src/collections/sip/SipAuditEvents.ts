import type { CollectionConfig } from 'payload';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';

export const SipAuditEvents: CollectionConfig = {
  slug: 'sip-audit-events',
  labels: { singular: 'SIP Audit Event', plural: 'SIP Audit Events' },
  admin: {
    useAsTitle: 'event',
    defaultColumns: ['userKey', 'event', 'origin', 'confidence', 'createdAt'],
    group: 'Student Intelligence',
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
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      index: true,
    },
    { name: 'origin', type: 'text', required: true },
    { name: 'event', type: 'text', required: true },
    { name: 'evidenceIds', type: 'json' },
    { name: 'model', type: 'text', defaultValue: 'sip-rules-v1' },
    { name: 'confidence', type: 'number', defaultValue: 0 },
    { name: 'payload', type: 'json' },
    {
      name: 'occurredAt',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
};
