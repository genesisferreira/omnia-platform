import type { CollectionConfig } from 'payload';

import {
  GOVERNANCE_SOURCE_TYPES,
  GOVERNANCE_STATES,
  KNOWLEDGE_SCOPES,
} from '@omnia/knowledge-governance';

import {
  isKnowledgePublisher,
  isTechnicalReviewer,
  knowledgeReadAccess,
} from '../../access/knowledge';
import { isPlatformAdmin, isSuperAdmin } from '../../access/rbac';

function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

const reviewAccess = ({ req: { user } }: { req: { user?: unknown } }) => {
  if (!user) return false;
  return (
    isTechnicalReviewer(user as never) ||
    isKnowledgePublisher(user as never) ||
    isPlatformAdmin(user as never) ||
    isSuperAdmin(user as never)
  );
};

/**
 * Epic 17 — submissions for Knowledge Hub review.
 * Professor content stays COURSE_PRIVATE until human approval.
 */
export const KnowledgeGovernanceSubmissions: CollectionConfig = {
  slug: 'knowledge-governance-submissions',
  labels: {
    singular: 'Envio para Base de Conhecimento',
    plural: 'Governança de Conhecimento',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'governanceState',
      'requestedScope',
      'schoolKey',
      'author',
      'submittedAt',
      'updatedAt',
    ],
    group: 'Neurofrigo AI',
    description:
      'Fila de revisão humana: conteúdo acadêmico do professor não vira Base Omnia automaticamente.',
    listSearchableFields: ['title', 'schoolKey', 'governanceState'],
  },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (reviewAccess({ req: { user } })) return true;
      // Instructors see own submissions
      return {
        author: {
          equals: (user as { id?: string | number }).id,
        },
      };
    },
    create: ({ req: { user } }) => Boolean(user),
    update: reviewAccess,
    delete: ({ req: { user } }) =>
      isKnowledgePublisher(user as never) || isSuperAdmin(user as never),
  },
  fields: [
    { name: 'title', type: 'text', required: true, index: true, label: 'Título' },
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      index: true,
      options: optionsFrom(GOVERNANCE_SOURCE_TYPES),
      label: 'Tipo de origem',
    },
    {
      name: 'sourceId',
      type: 'text',
      required: true,
      index: true,
      label: 'ID da origem',
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      index: true,
      label: 'Curso',
    },
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      index: true,
      label: 'Aula',
    },
    {
      name: 'lessonAsset',
      type: 'relationship',
      relationTo: 'lesson-assets',
      index: true,
      label: 'Material',
    },
    {
      name: 'learningResource',
      type: 'relationship',
      relationTo: 'learning-resources',
      index: true,
      label: 'Learning Resource',
    },
    {
      name: 'knowledgeDocument',
      type: 'relationship',
      relationTo: 'knowledge-documents',
      index: true,
      label: 'Documento Hub',
    },
    {
      name: 'schoolKey',
      type: 'text',
      required: true,
      index: true,
      label: 'Escola',
    },
    {
      name: 'ownerCompany',
      type: 'relationship',
      relationTo: 'companies',
      index: true,
      label: 'Empresa / tenant',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Autor',
    },
    {
      name: 'submittedAt',
      type: 'date',
      index: true,
      label: 'Enviado em',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'contentVersionHash',
      type: 'text',
      required: true,
      index: true,
      label: 'Hash da versão',
      admin: { readOnly: true },
    },
    {
      name: 'approvedVersionHash',
      type: 'text',
      index: true,
      label: 'Hash aprovado',
      admin: { readOnly: true },
    },
    {
      name: 'requestedScope',
      type: 'select',
      required: true,
      defaultValue: 'SCHOOL_APPROVED',
      options: optionsFrom(KNOWLEDGE_SCOPES.filter((s) => s !== 'COURSE_PRIVATE')),
      label: 'Escopo solicitado',
    },
    {
      name: 'knowledgeScope',
      type: 'select',
      required: true,
      defaultValue: 'COURSE_PRIVATE',
      index: true,
      options: optionsFrom(KNOWLEDGE_SCOPES),
      label: 'Escopo atual',
    },
    {
      name: 'governanceState',
      type: 'select',
      required: true,
      defaultValue: 'COURSE_PRIVATE',
      index: true,
      options: optionsFrom(GOVERNANCE_STATES),
      label: 'Estado',
    },
    {
      name: 'statusLabel',
      type: 'text',
      label: 'Status (professor)',
      admin: { readOnly: true, description: 'Texto amigável — sem jargão técnico.' },
    },
    {
      name: 'retrievalEligible',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: 'Elegível para recuperação IA',
    },
    {
      name: 'assessmentSecret',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: 'Segredo de avaliação (nunca indexar gabarito)',
    },
    {
      name: 'reviewNote',
      type: 'textarea',
      label: 'Nota da revisão',
    },
    {
      name: 'lastReviewer',
      type: 'relationship',
      relationTo: 'users',
      label: 'Último revisor',
    },
    {
      name: 'reviewedAt',
      type: 'date',
      label: 'Revisado em',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'decisions',
      type: 'array',
      label: 'Histórico de decisões',
      admin: { readOnly: true },
      fields: [
        { name: 'action', type: 'text', required: true },
        { name: 'fromState', type: 'text' },
        { name: 'toState', type: 'text' },
        { name: 'scope', type: 'text' },
        { name: 'reason', type: 'textarea' },
        { name: 'actorId', type: 'text' },
        { name: 'at', type: 'date', required: true },
        { name: 'versionHash', type: 'text' },
      ],
    },
  ],
};
