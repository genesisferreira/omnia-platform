import type { CollectionConfig } from 'payload';

import { KNOWLEDGE_AREAS } from '@omnia/neurofrigo-knowledge';

import {
  knowledgeCreateAccess,
  knowledgeDeleteAccess,
  knowledgeReadAccess,
  knowledgeUpdateAccess,
} from '../../access/knowledge';

function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

/**
 * Taxonomia do Knowledge Hub (independente das Categories do Blog).
 */
export const KnowledgeCategories: CollectionConfig = {
  slug: 'knowledge-categories',
  labels: {
    singular: 'Categoria de Conhecimento',
    plural: 'Categorias',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'knowledgeArea', 'active', 'sortOrder', 'updatedAt'],
    group: 'Neurofrigo AI',
    description:
      'Categorias sugeridas (CO₂, SCADA, etc.). Seed manual — sem conteúdo técnico automático.',
  },
  timestamps: true,
  access: {
    read: knowledgeReadAccess,
    create: knowledgeCreateAccess,
    update: knowledgeUpdateAccess,
    delete: knowledgeDeleteAccess,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      label: 'Nome',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Slug',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Descrição',
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'knowledge-categories',
      label: 'Categoria pai',
      filterOptions: ({ id }) => {
        if (id === undefined || id === null) return true;
        return { id: { not_equals: id } };
      },
    },
    {
      name: 'knowledgeArea',
      type: 'select',
      label: 'Área de conhecimento',
      options: optionsFrom(KNOWLEDGE_AREAS),
      index: true,
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Ativo',
      defaultValue: true,
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Ordem',
      defaultValue: 0,
    },
  ],
};
