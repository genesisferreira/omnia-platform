import type { CollectionConfig } from 'payload';

import {
  AGENT_KEYS,
  KNOWLEDGE_AREAS,
  SECURITY_CLASSIFICATIONS,
  SOURCE_TYPES,
} from '@omnia/neurofrigo-knowledge';

import {
  knowledgeCreateAccess,
  knowledgeDeleteAccess,
  knowledgeReadAccess,
  knowledgeUpdateAccess,
} from '../../access/knowledge';

function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

const AGENT_DISPLAY_NAMES: Record<(typeof AGENT_KEYS)[number], string> = {
  concierge: 'Concierge',
  tutor: 'Tutor Acadêmico',
  refrigeration: 'Refrigeração',
  'neurofrigo-technology': 'Neurofrigo Technology',
  'electrical-controls': 'Elétrica e Controles',
  evaluator: 'Avaliador',
  radar: 'Radar',
  'projects-lab': 'Projects Lab',
  'content-production': 'Produção de Conteúdo',
  commercial: 'Comercial',
  support: 'Suporte',
  command: 'Neurofrigo Command',
};

/**
 * ACL futura por agente. Campos seed-friendly para todas as agent keys, incluindo command.
 */
export const KnowledgeAgentAccess: CollectionConfig = {
  slug: 'knowledge-agent-access',
  labels: {
    singular: 'Acesso de Agente',
    plural: 'Agentes e Acessos',
  },
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['agentKey', 'displayName', 'active', 'canUseWebResearch', 'updatedAt'],
    group: 'Neurofrigo AI',
    description:
      'Allowlists por agente. command permanece restrito a super_admin em runtime (ACL de domínio).',
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
      name: 'agentKey',
      type: 'select',
      required: true,
      unique: true,
      index: true,
      label: 'Agent key',
      options: AGENT_KEYS.map((value) => ({
        label: `${AGENT_DISPLAY_NAMES[value]} (${value})`,
        value,
      })),
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
      label: 'Nome de exibição',
    },
    {
      name: 'allowedClassifications',
      type: 'select',
      hasMany: true,
      label: 'Classificações permitidas',
      options: optionsFrom(SECURITY_CLASSIFICATIONS),
    },
    {
      name: 'allowedKnowledgeAreas',
      type: 'select',
      hasMany: true,
      label: 'Áreas permitidas',
      options: optionsFrom(KNOWLEDGE_AREAS),
    },
    {
      name: 'allowedCategories',
      type: 'relationship',
      relationTo: 'knowledge-categories',
      hasMany: true,
      label: 'Categorias permitidas',
    },
    {
      name: 'allowedSourceTypes',
      type: 'select',
      hasMany: true,
      label: 'Tipos de fonte permitidos',
      options: optionsFrom(SOURCE_TYPES),
    },
    {
      name: 'canUseWebResearch',
      type: 'checkbox',
      label: 'Pode usar pesquisa web (futuro)',
      defaultValue: false,
    },
    {
      name: 'canUseUnpublished',
      type: 'checkbox',
      label: 'Pode usar não publicados',
      defaultValue: false,
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Ativo',
      defaultValue: true,
    },
    {
      name: 'seedNotes',
      type: 'textarea',
      label: 'Notas de seed',
      admin: {
        description:
          'Orientação para seed inicial. Ex.: command → somente super_admin; tutor → sem INTERNAL_RESTRICTED.',
      },
    },
  ],
};

export { AGENT_DISPLAY_NAMES };
