import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';

import {
  lmsContentCreateAccess,
  lmsContentDeleteAccess,
  lmsNestedReadAccess,
  lmsNestedWriteAccess,
} from '../../access/lms-content';

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

export const CourseModules: CollectionConfig = {
  slug: 'course-modules',
  labels: {
    singular: 'Módulo',
    plural: 'Módulos',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'course', 'order', 'published', 'updatedAt'],
    group: 'LMS',
    description: 'Módulos de um curso. Ordenação via campo order.',
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
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      index: true,
      label: 'Curso',
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Publicado',
      defaultValue: false,
      index: true,
    },
  ],
};
