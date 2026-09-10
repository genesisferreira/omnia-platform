import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from 'payload';

import {
  lmsContentCreateAccess,
  lmsContentDeleteAccess,
  lmsNestedReadAccess,
  lmsNestedWriteAccess,
} from '../../access/lms-content';
import { invalidateGovernanceOnLessonChange } from '../../services/knowledge/governance';
import { LESSON_TYPES, optionsFrom } from './constants';

const normalizeSlug: CollectionBeforeChangeHook = async ({ data }) => {
  if (!data) return data;
  if (typeof data.slug === 'string') {
    data.slug = data.slug
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  return data;
};

const lessonAfterChangeGovernance: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
  context,
}) => {
  if (context && typeof context === 'object' && 'governancePipelineActive' in context) {
    return doc;
  }
  if (operation !== 'update') return doc;
  void invalidateGovernanceOnLessonChange({
    payload: req.payload,
    lessonId: Number(doc.id),
    req,
  });
  return doc;
};

export const Lessons: CollectionConfig = {
  slug: 'lessons',
  labels: {
    singular: 'Aula',
    plural: 'Aulas',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'module', 'type', 'order', 'published', 'updatedAt'],
    group: 'LMS',
    description:
      'Aulas do módulo. Vídeos/PDFs entram como Lesson Assets (Media) — não embutir arquivo na aula.',
  },
  timestamps: true,
  access: {
    read: lmsNestedReadAccess,
    create: lmsContentCreateAccess,
    update: lmsNestedWriteAccess,
    delete: lmsContentDeleteAccess,
  },
  hooks: {
    beforeChange: [normalizeSlug],
    afterChange: [lessonAfterChangeGovernance],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
      label: 'Título',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      label: 'Slug',
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Resumo',
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Conteúdo',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'text',
      index: true,
      label: 'Tipo',
      options: optionsFrom(LESSON_TYPES).map((o) => ({
        ...o,
        label:
          o.value === 'video'
            ? 'Vídeo'
            : o.value === 'pdf'
              ? 'PDF'
              : o.value === 'text'
                ? 'Texto'
                : o.value === 'download'
                  ? 'Download'
                  : 'Link externo',
      })),
    },
    {
      name: 'externalUrl',
      type: 'text',
      label: 'URL externa',
      admin: {
        condition: (_, siblingData) =>
          siblingData?.type === 'external_link' || siblingData?.type === 'video',
        description: 'YouTube/Vimeo ou link externo. Upload de arquivo vai em Materiais.',
      },
    },
    {
      name: 'duration',
      type: 'number',
      label: 'Duração (minutos)',
      min: 0,
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 1,
      min: 0,
      index: true,
      label: 'Ordem',
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Publicada',
      defaultValue: false,
      index: true,
    },
    {
      name: 'module',
      type: 'relationship',
      relationTo: 'course-modules',
      required: true,
      index: true,
      label: 'Módulo',
    },
  ],
};
