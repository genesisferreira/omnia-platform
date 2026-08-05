import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';
import { APIError } from 'payload';

import {
  isLmsPublisher,
  lmsContentCreateAccess,
  lmsContentDeleteAccess,
  lmsContentReadAccess,
  lmsCourseUpdateAccess,
} from '../../access/lms-content';
import { createSeoFields } from '../../fields/seo';
import { COURSE_LEVELS, optionsFrom } from './constants';

const normalizeAndGuardStatus: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) return data;
  if (typeof data.slug === 'string') {
    data.slug = data.slug
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  const nextStatus = data.status ?? originalDoc?.status;
  // Seed/sistema (sem user) pode publicar; usuários precisam ser publisher.
  if (
    (nextStatus === 'published' || nextStatus === 'archived') &&
    req.user &&
    !isLmsPublisher(req.user)
  ) {
    throw new APIError('Somente admin pode publicar ou arquivar cursos.', 403);
  }

  if (nextStatus === 'published' && !data.publishedAt && !originalDoc?.publishedAt) {
    data.publishedAt = new Date().toISOString();
  }
  return data;
};

/**
 * Catálogo de cursos nativo (Payload) — LMS Core.
 * Independente do connector Moodle.
 */
export const Courses: CollectionConfig = {
  slug: 'courses',
  labels: {
    singular: 'Curso',
    plural: 'Cursos',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'level', 'visibility', 'updatedAt'],
    group: 'LMS',
    description: 'Catálogo de cursos do LMS Core (Payload). Sem provas/certificados nesta entrega.',
  },
  timestamps: true,
  access: {
    read: lmsContentReadAccess,
    create: lmsContentCreateAccess,
    update: lmsCourseUpdateAccess,
    delete: lmsContentDeleteAccess,
  },
  hooks: {
    beforeChange: [normalizeAndGuardStatus],
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
      unique: true,
      index: true,
      label: 'Slug',
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      label: 'Descrição curta',
      maxLength: 280,
    },
    {
      name: 'description',
      type: 'richText',
      label: 'Descrição',
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Imagem de destaque',
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      label: 'Thumbnail',
    },
    {
      name: 'instructor',
      type: 'relationship',
      relationTo: 'users',
      label: 'Instrutor',
      index: true,
      admin: {
        description: 'Usuário responsável pedagógico (papel instructor recomendado).',
      },
    },
    {
      name: 'ownerCompany',
      type: 'relationship',
      relationTo: 'companies',
      label: 'Empresa dona',
      index: true,
    },
    {
      name: 'category',
      type: 'text',
      label: 'Categoria',
      index: true,
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
          label: 'Tag',
        },
      ],
    },
    {
      name: 'level',
      type: 'select',
      label: 'Nível',
      defaultValue: 'beginner',
      options: optionsFrom(COURSE_LEVELS).map((o) => ({
        ...o,
        label:
          o.value === 'beginner'
            ? 'Iniciante'
            : o.value === 'intermediate'
              ? 'Intermediário'
              : 'Avançado',
      })),
    },
    {
      name: 'language',
      type: 'text',
      label: 'Idioma',
      defaultValue: 'pt-BR',
    },
    {
      name: 'estimatedHours',
      type: 'number',
      label: 'Carga horária estimada (h)',
      min: 0,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      label: 'Status',
      options: [
        { label: 'Rascunho', value: 'draft' },
        { label: 'Em revisão', value: 'review' },
        { label: 'Publicado', value: 'published' },
        { label: 'Arquivado', value: 'archived' },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Publicado em',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Destaque',
      defaultValue: false,
    },
    {
      name: 'visibility',
      type: 'select',
      required: true,
      defaultValue: 'public',
      index: true,
      label: 'Visibilidade',
      options: [
        { label: 'Público', value: 'public' },
        { label: 'Autenticado', value: 'authenticated' },
        { label: 'Empresa', value: 'company' },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      label: 'SEO',
      fields: createSeoFields(),
    },
  ],
};
