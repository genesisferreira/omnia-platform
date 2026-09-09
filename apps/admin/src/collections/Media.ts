import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Access, CollectionConfig } from 'payload';

import { isStaffRole, type PlatformRole } from '@omnia/constants';

import { staffOnly } from '../access/rbac';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Diretório estável — evita CWD do container apontar para pasta vazia (FPA-003). */
export function resolveMediaStaticDir(): string {
  if (process.env.PAYLOAD_MEDIA_DIR?.trim()) {
    return path.resolve(process.env.PAYLOAD_MEDIA_DIR.trim());
  }
  return path.resolve(__dirname, '../../media');
}

const instructorOrStaffCreate: Access = ({ req }) => {
  const role = (req.user as { role?: PlatformRole } | null)?.role;
  if (!role) return false;
  if (isStaffRole(role)) return true;
  return role === 'instructor';
};

/**
 * Media Library — upload local.
 * Integração MinIO documentada em src/storage/README.md
 *
 * ACL: leitura pública de metadados/URLs necessárias ao portal;
 * create permitido a staff + instructor (authoring).
 * Consumo cross-school deve ser reforçado via lesson/enrollment no player acadêmico —
 * não abrir write público.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Conteúdo',
  },
  upload: {
    staticDir: resolveMediaStaticDir(),
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
    // Leitura pública necessária para URLs de mídia no Portal (imagens/PDF publicados).
    // Serve de ficheiro continua a exigir ficheiro presente em staticDir.
    read: () => true,
    create: instructorOrStaffCreate,
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
