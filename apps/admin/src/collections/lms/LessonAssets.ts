import type { CollectionConfig } from 'payload';

import {
  lmsContentCreateAccess,
  lmsContentDeleteAccess,
  lmsNestedReadAccess,
  lmsNestedWriteAccess,
} from '../../access/lms-content';
import { LESSON_ASSET_TYPES, optionsFrom } from './constants';

/**
 * Materiais da aula — sempre via relationship para Media (sem blob na Lesson).
 */
export const LessonAssets: CollectionConfig = {
  slug: 'lesson-assets',
  labels: {
    singular: 'Material',
    plural: 'Materiais',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'lesson', 'assetType', 'order', 'updatedAt'],
    group: 'LMS',
    description: 'Materiais (vídeo, PDF, anexos) referenciando a collection Media existente.',
  },
  timestamps: true,
  access: {
    read: lmsNestedReadAccess,
    create: lmsContentCreateAccess,
    update: lmsNestedWriteAccess,
    delete: lmsContentDeleteAccess,
  },
  fields: [
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      required: true,
      index: true,
      label: 'Aula',
    },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Arquivo (Media)',
    },
    {
      name: 'assetType',
      type: 'select',
      required: true,
      defaultValue: 'attachment',
      index: true,
      label: 'Tipo de material',
      options: optionsFrom(LESSON_ASSET_TYPES).map((o) => ({
        ...o,
        label:
          o.value === 'video'
            ? 'Vídeo'
            : o.value === 'pdf'
              ? 'PDF'
              : o.value === 'image'
                ? 'Imagem'
                : o.value === 'slides'
                  ? 'Slides'
                  : o.value === 'zip'
                    ? 'ZIP'
                    : o.value === 'spreadsheet'
                      ? 'Planilha'
                      : 'Anexo',
      })),
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Título',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Descrição',
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
  ],
};
