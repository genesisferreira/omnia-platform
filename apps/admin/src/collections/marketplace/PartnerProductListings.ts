import type { CollectionConfig } from 'payload';

import {
  partnerMembershipCreateAccess,
  partnerMembershipScopedAccess,
} from '../../access/marketplace';
import { GROUP, listingFields } from './fields';
import { listingBeforeChange, listingBeforeValidate } from './hooks';

/**
 * Catálogo de produtos do parceiro. Leitura pública apenas via endpoints dedicados
 * (somente `published` de parceiros aprovados); o acesso da collection é staff ou associação.
 */
export const PartnerProductListings: CollectionConfig = {
  slug: 'partner-product-listings',
  labels: { singular: 'Produto do parceiro', plural: 'Produtos dos parceiros' },
  admin: {
    useAsTitle: 'title',
    group: GROUP,
    defaultColumns: ['title', 'partner', 'brand', 'priceMode', 'status', 'updatedAt'],
    description: 'Produtos anunciados por parceiros (moderação: staff).',
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
    beforeValidate: [listingBeforeValidate],
    beforeChange: [listingBeforeChange],
  },
  fields: listingFields('product'),
};
