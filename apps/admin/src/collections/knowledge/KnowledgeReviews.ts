import type { CollectionConfig } from 'payload';

import {
  knowledgeCreateAccess,
  knowledgeDeleteAccess,
  knowledgeReadAccess,
  knowledgeUpdateAccess,
} from '../../access/knowledge';

/**
 * Revisões técnicas / segurança / pedagógicas de documentos.
 */
export const KnowledgeReviews: CollectionConfig = {
  slug: 'knowledge-reviews',
  labels: {
    singular: 'Revisão',
    plural: 'Revisões',
  },
  admin: {
    useAsTitle: 'decision',
    defaultColumns: ['document', 'decision', 'reviewer', 'reviewedAt', 'updatedAt'],
    group: 'Neurofrigo AI',
    description: 'Registro de decisões de revisão humana.',
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
      name: 'document',
      type: 'relationship',
      relationTo: 'knowledge-documents',
      required: true,
      index: true,
      label: 'Documento',
    },
    {
      name: 'version',
      type: 'text',
      label: 'Versão revisada',
    },
    {
      name: 'reviewer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Revisor',
    },
    {
      name: 'decision',
      type: 'select',
      required: true,
      label: 'Decisão',
      options: [
        { label: 'Aprovado', value: 'approved' },
        { label: 'Rejeitado', value: 'rejected' },
        { label: 'Ajustes necessários', value: 'needs_changes' },
      ],
      index: true,
    },
    {
      name: 'comments',
      type: 'textarea',
      label: 'Comentários',
    },
    {
      name: 'technicalValidation',
      type: 'checkbox',
      label: 'Validação técnica',
      defaultValue: false,
    },
    {
      name: 'securityValidation',
      type: 'checkbox',
      label: 'Validação de segurança',
      defaultValue: false,
    },
    {
      name: 'pedagogicalValidation',
      type: 'checkbox',
      label: 'Validação pedagógica',
      defaultValue: false,
    },
    {
      name: 'reviewedAt',
      type: 'date',
      label: 'Revisado em',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
};
