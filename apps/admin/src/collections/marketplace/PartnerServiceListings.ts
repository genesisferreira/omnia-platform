import type { CollectionConfig } from 'payload';

import {
  partnerMembershipCreateAccess,
  partnerMembershipScopedAccess,
} from '../../access/marketplace';
import { GROUP, listingFields } from './fields';
import {
  listingAfterChange,
  listingBeforeChange,
  listingBeforeOperation,
  listingBeforeValidate,
} from './hooks';

/**
 * Catálogo de serviços do parceiro. Leitura pública apenas via endpoints dedicados
 * (somente `published` de parceiros aprovados); o acesso da collection é staff ou associação.
 */
export const PartnerServiceListings: CollectionConfig = {
  slug: 'partner-service-listings',
  labels: { singular: 'Serviço do parceiro', plural: 'Serviços dos parceiros' },
  admin: {
    useAsTitle: 'title',
    group: GROUP,
    defaultColumns: ['title', 'partner', 'category', 'priceMode', 'status', 'updatedAt'],
    description: 'Serviços anunciados por parceiros (moderação: staff).',
  },
  timestamps: true,
  access: {
    read: partnerMembershipScopedAccess('view'),
    create: partnerMembershipCreateAccess('edit'),
    update: partnerMembershipScopedAccess('edit'),
    delete: partnerMembershipScopedAccess('manage'),
  },
  indexes: [{ fields: ['partner', 'slug'], unique: true }],
  hooks: {
    beforeOperation: [listingBeforeOperation],
    beforeValidate: [listingBeforeValidate],
    beforeChange: [listingBeforeChange],
    afterChange: [listingAfterChange],
  },
  fields: listingFields('service'),
};
