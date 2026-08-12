import type {
  Access,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  TextFieldSingleValidation,
  Where,
} from 'payload';

import { PUBLIC_PAGE_MAX_BLOCKS, PUBLIC_PAGE_TYPES } from '@omnia/shared';

import { staffOnly } from '../access/rbac';
import { pageBlocks } from '../blocks/pageBlocks';
import { isValidPageSlug, normalizePageSlug } from './pages-rules';

const authenticated: Access = staffOnly;

const validateSlug: TextFieldSingleValidation = (value) => {
  if (!value) {
    return true;
  }

  if (typeof value !== 'string' || !isValidPageSlug(value)) {
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

  const normalized = normalizePageSlug(data.slug);
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
    collection: 'pages',
    where: { and },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.docs.length > 0) {
    throw new Error(`Já existe uma página com o slug "${slug}" neste site.`);
  }

  return data;
};

const ensureSingleHomePerSite: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) {
    return data;
  }

  const pageType =
    typeof data.pageType === 'string'
      ? data.pageType
      : typeof originalDoc?.pageType === 'string'
        ? originalDoc.pageType
        : null;

  if (pageType !== 'home') {
    return data;
  }

  const siteId = getSiteId(data.site ?? originalDoc?.site);
  if (siteId === null) {
    return data;
  }

  const and: Where[] = [{ site: { equals: siteId } }, { pageType: { equals: 'home' } }];

  if (operation === 'update' && originalDoc?.id !== undefined) {
    and.push({ id: { not_equals: originalDoc.id } });
  }

  const existing = await req.payload.find({
    collection: 'pages',
    where: { and },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.docs.length > 0) {
    throw new Error('Já existe uma Home para este site. Só é permitida uma Home por site.');
  }

  return data;
};

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: 'Página',
    plural: 'Páginas',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'pageType', 'site', 'updatedAt', '_status'],
    group: 'Conteúdo',
    description: 'Páginas editáveis por site (Home e páginas padrão).',
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
    beforeChange: [ensureSiteSlugUniqueness, ensureSingleHomePerSite],
  },
  fields: [
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: true,
      index: true,
      label: 'Site',
      admin: {
        description: 'Ownership principal. Tenant/company derivam do Site.',
      },
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
      admin: {
        description: 'Único por site. Home institucional usa “home”.',
      },
    },
    {
      name: 'pageType',
      type: 'select',
      required: true,
      defaultValue: 'standard',
      index: true,
      label: 'Tipo',
      options: PUBLIC_PAGE_TYPES.map((value) => ({
        label: value === 'home' ? 'Home' : 'Página padrão',
        value,
      })),
    },
    {
      name: 'layout',
      type: 'blocks',
      label: 'Blocks',
      blocks: pageBlocks,
      maxRows: PUBLIC_PAGE_MAX_BLOCKS,
      admin: {
        initCollapsed: false,
      },
    },
    {
      name: 'seo',
      type: 'group',
      label: 'SEO',
      fields: [
        {
          name: 'metaTitle',
          type: 'text',
          label: 'Meta title',
          maxLength: 60,
        },
        {
          name: 'metaDescription',
          type: 'textarea',
          label: 'Meta description',
          maxLength: 160,
        },
        {
          name: 'canonicalUrl',
          type: 'text',
          label: 'URL canônica',
        },
        {
          name: 'noIndex',
          type: 'checkbox',
          defaultValue: false,
          label: 'noIndex',
        },
      ],
    },
  ],
};
