import type { CollectionConfig } from 'payload';

/**
 * Media Library — upload local no Sprint 2.
 * Integração MinIO documentada em src/storage/README.md
 */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Conteúdo',
  },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 512,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Texto alternativo',
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Legenda',
    },
  ],
};
