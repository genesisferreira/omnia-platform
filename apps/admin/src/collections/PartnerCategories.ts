import type { CollectionConfig } from 'payload';

import { adminsOnly, staffOnly } from '../access/rbac';

/**
 * Taxonomia do Partner Network (independente das Categories do Blog).
 */
export const PartnerCategories: CollectionConfig = {
  slug: 'partner-categories',
  labels: {
    singular: 'Categoria de Parceiro',
    plural: 'Categorias',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'active', 'updatedAt'],
    group: 'Partner Network',
    description: 'Categorias da rede de parceiros (refrigeração, HVAC, PMOC, etc.).',
  },
  timestamps: true,
  access: {
    // Admin: CRUD; Moderador (editor): somente leitura; Parceiro: sem acesso.
    read: staffOnly,
    create: adminsOnly,
    update: adminsOnly,
    delete: adminsOnly,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nome',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Slug',
      admin: {
        description: 'Identificador estável para filtros e SEO futuro.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Descrição',
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Ativo',
      defaultValue: true,
    },
  ],
};
