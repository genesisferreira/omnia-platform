import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Access, CollectionConfig } from 'payload';

import { isStaffRole, type PlatformRole } from '@omnia/constants';

import { staffOnly } from '../access/rbac';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Canonical persistent media path inside Docker images (see Dockerfile VOLUME). */
export const CANONICAL_MEDIA_PATH = '/app/media';

/**
 * Resolve Payload upload staticDir.
 * Priority: PAYLOAD_MEDIA_DIR → /app/media (Docker) → apps/admin/media (local).
 */
export function resolveMediaStaticDir(
  env: NodeJS.ProcessEnv = process.env,
  exists: (p: string) => boolean = existsSync,
): string {
  const fromEnv = env.PAYLOAD_MEDIA_DIR?.trim();
  if (fromEnv) {
    // Keep POSIX absolute paths intact (Docker Linux); resolve only relative ones.
    if (fromEnv.startsWith('/')) return fromEnv;
    return path.resolve(fromEnv);
  }
  if (exists(CANONICAL_MEDIA_PATH)) return CANONICAL_MEDIA_PATH;
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
 * Persistência: PAYLOAD_MEDIA_DIR=/app/media + volume no mesmo path.
 * Não resolver persistência tornando Media write-público.
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
