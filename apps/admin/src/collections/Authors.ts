import type {
  Access,
  CollectionBeforeValidateHook,
  CollectionConfig,
  TextFieldSingleValidation,
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

export const Authors: CollectionConfig = {
  slug: 'authors',
  labels: {
    singular: 'Autor',
    plural: 'Autores',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'updatedAt', '_status'],
    group: 'Blog',
    description: 'Perfis públicos de autores do Blog.',
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
  },
  fields: [
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
      unique: true,
      index: true,
      label: 'Slug',
      validate: validateSlug,
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'Bio',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: 'Avatar',
    },
    {
      name: 'social',
      type: 'group',
      label: 'Redes sociais',
      fields: [
        {
          name: 'linkedin',
          type: 'text',
          label: 'LinkedIn',
        },
        {
          name: 'twitter',
          type: 'text',
          label: 'X / Twitter',
        },
        {
          name: 'instagram',
          type: 'text',
          label: 'Instagram',
        },
      ],
    },
  ],
};
