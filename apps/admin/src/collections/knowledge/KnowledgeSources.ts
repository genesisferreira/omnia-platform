import type { CollectionConfig } from 'payload';

import { AGENT_KEYS, SOURCE_TYPES } from '@omnia/neurofrigo-knowledge';

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
 * Origens e confiabilidade de fontes (web research futuro desligado).
 */
export const KnowledgeSources: CollectionConfig = {
  slug: 'knowledge-sources',
  labels: {
    singular: 'Fonte de Conhecimento',
    plural: 'Fontes',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: [
      'name',
      'sourceType',
      'reliabilityLevel',
      'approvedForWebResearch',
      'active',
      'updatedAt',
    ],
    group: 'Neurofrigo AI',
    description: 'Cadastro de origens e confiabilidade. Pesquisa web real não está habilitada.',
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
      name: 'sourceType',
      type: 'select',
      required: true,
      label: 'Tipo',
      options: optionsFrom(SOURCE_TYPES),
    },
    {
      name: 'domain',
      type: 'text',
      label: 'Domínio',
    },
    {
      name: 'organization',
      type: 'text',
      label: 'Organização',
    },
    {
      name: 'reliabilityLevel',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      label: 'Confiabilidade',
      options: [
        { label: 'Baixa', value: 'low' },
        { label: 'Média', value: 'medium' },
        { label: 'Alta', value: 'high' },
        { label: 'Verificada', value: 'verified' },
      ],
    },
    {
      name: 'approvedForWebResearch',
      type: 'checkbox',
      label: 'Aprovada para pesquisa web (futuro)',
      defaultValue: false,
    },
    {
      name: 'allowedAgents',
      type: 'select',
      hasMany: true,
      label: 'Agentes permitidos',
      options: optionsFrom(AGENT_KEYS),
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Ativo',
      defaultValue: true,
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notas',
    },
    {
      name: 'lastReviewedAt',
      type: 'date',
      label: 'Última revisão',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
};
