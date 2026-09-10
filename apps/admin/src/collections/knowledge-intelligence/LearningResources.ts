import type { CollectionConfig } from 'payload';

import { KI_PROCESSING_STATUSES, KI_RESOURCE_TYPES } from '@omnia/knowledge-intelligence';

import { kiPublisherAccess, kiStaffAccess } from '../../access/knowledge-intelligence';
import {
  learningResourceAfterChange,
  learningResourceBeforeChange,
} from '../../services/knowledge-intelligence/hooks';
import { learningResourceAfterChangeForRetrieval } from '../../services/retrieval/hooks';

function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

/**
 * Learning Resource — ponte Media → Knowledge Intelligence.
 * A IA nunca lê Media diretamente; sempre via este recurso.
 */
export const LearningResources: CollectionConfig = {
  slug: 'learning-resources',
  labels: {
    singular: 'Resource',
    plural: 'Resources',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'resourceType', 'processingStatus', 'version', 'updatedAt'],
    group: 'Knowledge Intelligence',
    description:
      'Recurso canônico para a fábrica de conhecimento. Pipeline: extract → normalize → chunk → Knowledge Hub → embedding queue (sem embeddings reais).',
  },
  timestamps: true,
  access: {
    read: kiStaffAccess,
    create: kiStaffAccess,
    update: kiStaffAccess,
    delete: kiPublisherAccess,
  },
  hooks: {
    beforeChange: [learningResourceBeforeChange],
    afterChange: [learningResourceAfterChange, learningResourceAfterChangeForRetrieval],
  },
  fields: [
    { name: 'title', type: 'text', required: true, index: true, label: 'Título' },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Media',
      admin: {
        description: 'Arquivo fonte. Processadores leem via Learning Resource, não Media crua.',
      },
    },
    {
      name: 'lessonAsset',
      type: 'relationship',
      relationTo: 'lesson-assets',
      index: true,
      label: 'Lesson Asset (LMS)',
    },
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      index: true,
      label: 'Aula',
    },
    {
      name: 'module',
      type: 'relationship',
      relationTo: 'course-modules',
      index: true,
      label: 'Módulo',
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      index: true,
      label: 'Curso',
    },
    {
      name: 'resourceType',
      type: 'select',
      required: true,
      index: true,
      options: optionsFrom(KI_RESOURCE_TYPES),
      label: 'Tipo',
    },
    {
      name: 'version',
      type: 'text',
      defaultValue: '1.0.0',
      label: 'Versão',
    },
    {
      name: 'language',
      type: 'text',
      defaultValue: 'pt-BR',
      label: 'Idioma',
    },
    { name: 'author', type: 'text', label: 'Autor' },
    { name: 'license', type: 'text', label: 'Licença', defaultValue: 'internal' },
    {
      name: 'origin',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'LMS Lesson Asset', value: 'lms_lesson_asset' },
        { label: 'Manual', value: 'manual' },
        { label: 'Upload', value: 'upload' },
      ],
      label: 'Origem',
    },
    {
      name: 'fileHash',
      type: 'text',
      index: true,
      label: 'Hash do arquivo (sha256)',
      admin: { readOnly: true },
    },
    {
      name: 'processingStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: optionsFrom(KI_PROCESSING_STATUSES),
      label: 'Status de processamento',
    },
    {
      name: 'autoProcess',
      type: 'checkbox',
      defaultValue: true,
      label: 'Processar automaticamente',
    },
    {
      name: 'ownerCompany',
      type: 'relationship',
      relationTo: 'companies',
      index: true,
      label: 'Empresa dona',
    },
    {
      name: 'instructor',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      label: 'Instrutor',
    },
    {
      name: 'category',
      type: 'text',
      label: 'Categoria',
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      fields: [{ name: 'tag', type: 'text', required: true }],
    },
    {
      name: 'extractedText',
      type: 'textarea',
      label: 'Texto extraído',
      admin: { rows: 6 },
    },
    {
      name: 'extractMeta',
      type: 'json',
      label: 'Metadados da extração',
    },
    {
      name: 'normalizedText',
      type: 'textarea',
      label: 'Texto normalizado',
      admin: { rows: 6 },
    },
    {
      name: 'knowledgeDocument',
      type: 'relationship',
      relationTo: 'knowledge-documents',
      index: true,
      label: 'Knowledge Document',
    },
    {
      name: 'lastError',
      type: 'textarea',
      label: 'Último erro (sanitizado)',
      admin: { readOnly: true },
    },
    {
      name: 'processedAt',
      type: 'date',
      label: 'Processado em',
      admin: { date: { pickerAppearance: 'dayAndTime' }, readOnly: true },
    },
    {
      name: 'knowledgeScope',
      type: 'select',
      defaultValue: 'COURSE_PRIVATE',
      index: true,
      options: [
        { label: 'Privado do curso', value: 'COURSE_PRIVATE' },
        { label: 'Aprovado escola', value: 'SCHOOL_APPROVED' },
        { label: 'Aprovado Omnia', value: 'OMNIA_APPROVED' },
      ],
      label: 'Escopo de conhecimento',
      admin: {
        description: 'Governança Epic 17 — distinto de visibilidade de Media.',
      },
    },
    {
      name: 'schoolKey',
      type: 'text',
      index: true,
      label: 'Escola (schoolKey)',
    },
    {
      name: 'governanceState',
      type: 'text',
      index: true,
      defaultValue: 'COURSE_PRIVATE',
      label: 'Estado de governança',
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
      label: 'Segredo de avaliação',
    },
    {
      name: 'contentVersionHash',
      type: 'text',
      index: true,
      label: 'Hash da versão',
      admin: { readOnly: true },
    },
  ],
};
