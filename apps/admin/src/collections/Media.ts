import type { CollectionConfig } from 'payload';

import { staffOnly } from '../access/rbac';

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
    mimeTypes: [
      'image/*',
      'video/*',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
    ],
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
    // Leitura pública necessária para URLs de mídia no Portal.
    read: () => true,
    create: staffOnly,
    update: staffOnly,
    delete: staffOnly,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Texto alternativo',
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Legenda',
    },
  ],
};
