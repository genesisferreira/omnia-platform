import type { CollectionConfig } from 'payload';

import { academicAdminDeleteAccess, academicAdminWriteAccess } from '../../access/lms-academic';
import { isPlatformAdmin, isSuperAdmin } from '../../access/rbac';
import { ilsGroup, schoolKeyField } from './fields';

export const IlsConsents: CollectionConfig = {
  slug: 'ils-consents',
  labels: { singular: 'Consentimento ILS', plural: 'Consentimentos ILS' },
  admin: {
    useAsTitle: 'purpose',
    defaultColumns: ['user', 'schoolKey', 'textVersion', 'acceptedAt'],
    group: ilsGroup,
  },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (isPlatformAdmin(user) || isSuperAdmin(user)) return true;
      return { user: { equals: user.id } };
    },
    create: academicAdminWriteAccess,
    update: academicAdminWriteAccess,
    delete: academicAdminDeleteAccess,
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    schoolKeyField,
    { name: 'purpose', type: 'text', required: true, defaultValue: 'educational_onboarding' },
    { name: 'textVersion', type: 'text', required: true },
    { name: 'accepted', type: 'checkbox', defaultValue: false },
    { name: 'acceptedAt', type: 'date' },
  ],
};
