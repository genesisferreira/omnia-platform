import type {
  Access,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  TextFieldSingleValidation,
  Where,
} from 'payload';

import { isValidBlogSlug, normalizeBlogSlug } from './blog-rules';

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
    collection: 'tags',
    where: { and },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.docs.length > 0) {
    throw new Error(`Já existe uma tag com o slug "${slug}" neste site.`);
  }

  return data;
};

export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: {
    singular: 'Tag',
    plural: 'Tags',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'site', 'updatedAt'],
    group: 'Blog',
    description: 'Tags flat do Blog por site.',
  },
  timestamps: true,
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    beforeValidate: [normalizeSlugHook],
    beforeChange: [ensureSiteSlugUniqueness],
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
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      label: 'Nome',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      label: 'Slug',
      validate: validateSlug,
    },
  ],
};
