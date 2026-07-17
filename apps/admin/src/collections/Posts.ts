import type {
  Access,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  TextFieldSingleValidation,
  Where,
} from 'payload';

import { createPublishingFields } from '../fields/publishing';
import { createSeoFields } from '../fields/seo';
import { isValidBlogSlug, normalizeBlogSlug, PUBLIC_POST_TYPES } from './blog-rules';

const authenticated: Access = ({ req: { user } }) => Boolean(user);

const validateSlug: TextFieldSingleValidation = (value) => {
  if (!value) {
    return true;
  }

  if (typeof value !== 'string' || !isValidBlogSlug(value)) {
    return 'Use apenas letras minúsculas, números e hífen. Não inicie nem termine com hífen.';
  }

  return true;
};

const getSiteId = (site: unknown): string | number | null => {
  if (typeof site === 'number' || typeof site === 'string') {
    return site;
  }

  if (typeof site === 'object' && site !== null && 'id' in site) {
    const id = (site as { id: unknown }).id;
    if (typeof id === 'number' || typeof id === 'string') {
      return id;
    }
  }

  return null;
};

const normalizeSlugHook: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) {
    return data;
  }

  const normalized = normalizeBlogSlug(data.slug);
  if (normalized) {
    data.slug = normalized;
  }

  return data;
};

const ensureSiteSlugUniqueness: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) {
    return data;
  }

  const siteId = getSiteId(data.site ?? originalDoc?.site);
  const slug =
    typeof data.slug === 'string'
      ? data.slug
      : typeof originalDoc?.slug === 'string'
        ? originalDoc.slug
        : null;

  if (siteId === null || !slug) {
    return data;
  }

  const and: Where[] = [{ site: { equals: siteId } }, { slug: { equals: slug } }];

  if (operation === 'update' && originalDoc?.id !== undefined) {
    and.push({ id: { not_equals: originalDoc.id } });
  }

  const existing = await req.payload.find({
    collection: 'posts',
    where: { and },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.docs.length > 0) {
    throw new Error(`Já existe um post com o slug "${slug}" neste site.`);
  }

  return data;
};

const setPublishedAtOnPublish: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) {
    return data;
  }

  const nextStatus =
    typeof data._status === 'string'
      ? data._status
      : typeof originalDoc?._status === 'string'
        ? originalDoc._status
        : null;

  if (nextStatus === 'published') {
    const existingPublishedAt =
      data.publishedAt ??
      (typeof originalDoc?.publishedAt === 'string' || originalDoc?.publishedAt instanceof Date
        ? originalDoc.publishedAt
        : null);

    if (!existingPublishedAt) {
      data.publishedAt = new Date().toISOString();
    }
  }

  return data;
};

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: 'Post',
    plural: 'Posts',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'type', 'site', 'publishedAt', '_status'],
    group: 'Blog',
    description: 'Artigos, posts e notícias do Portal.',
  },
  timestamps: true,
  versions: {
    drafts: {
      autosave: true,
    },
    maxPerDoc: 25,
  },
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    beforeValidate: [normalizeSlugHook],
    beforeChange: [ensureSiteSlugUniqueness, setPublishedAtOnPublish],
  },
  fields: [
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: true,
      index: true,
      label: 'Site',
    },
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
      validate: validateSlug,
    },
    {
      name: 'excerpt',
      type: 'textarea',
      label: 'Resumo',
      admin: {
        description: 'Resumo curto para listagens, SEO e compartilhamento.',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'blog',
      index: true,
      label: 'Tipo',
      options: PUBLIC_POST_TYPES.map((value) => ({
        label: value === 'blog' ? 'Blog' : value === 'article' ? 'Artigo' : 'Notícia',
        value,
      })),
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Conteúdo',
      required: true,
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Imagem de destaque',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'authors',
      label: 'Autor',
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      label: 'Categorias',
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      label: 'Tags',
    },
    {
      name: 'relatedPosts',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      label: 'Posts relacionados',
      filterOptions: ({ id }) => {
        if (id === undefined || id === null) {
          return true;
        }

        return {
          id: {
            not_equals: id,
          },
        };
      },
      admin: {
        description: 'Até 6 posts relacionados recomendados na leitura pública.',
      },
    },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      label: 'Empresa (opcional)',
      admin: {
        description: 'Escopo opcional por empresa do ecossistema.',
        position: 'sidebar',
      },
    },
    {
      name: 'seo',
      type: 'group',
      label: 'SEO',
      fields: createSeoFields(),
    },
    ...createPublishingFields(),
  ],
};
