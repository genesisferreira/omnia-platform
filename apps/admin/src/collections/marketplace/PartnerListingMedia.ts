import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Access, CollectionBeforeOperationHook, CollectionConfig, Where } from 'payload';
import { APIError } from 'payload';

import {
  MARKETPLACE_DATASHEET_MAX_BYTES,
  MARKETPLACE_IMAGE_MAX_BYTES,
  detectMarketplaceFileType,
} from '@omnia/shared';

import { getActivePartnerIds, partnerMembershipCreateAccess, partnerMembershipScopedAccess } from '../../access/marketplace';
import { getRelationId, hasStaffAccess } from '../../access/rbac';
import { resolveMediaStaticDir } from '../Media';
import { GROUP, staffFieldAccess } from './fields';

/**
 * Leitura (inclui o binário em /api/partner-listing-media/file/*): staff total; anônimo e
 * terceiros só o que está `public` (anexado a anúncio publicado); membros veem os da empresa.
 */
const listingMediaRead: Access = async ({ req: { user, payload } }) => {
  const publicOnly: Where = { public: { equals: true } };
  if (!user) return publicOnly;
  if (hasStaffAccess(user)) return true;
  const ids = await getActivePartnerIds(payload, user.id);
  if (ids.length === 0) return publicOnly;
  return { or: [publicOnly, { partner: { in: ids } }] };
};

/**
 * Valida o arquivo pelo conteúdo (não pela extensão/MIME declarados), aplica limite de tamanho
 * por tipo e troca o nome por um aleatório (URL não adivinhável enquanto o anúncio é rascunho).
 */
const validateListingUpload: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation !== 'create' && operation !== 'update') return args;
  const file = req.file;
  if (!file) {
    if (operation === 'create') throw new APIError('Envie um arquivo.', 400);
    return args;
  }

  const buffer =
    file.data && file.data.length > 0
      ? file.data
      : file.tempFilePath
        ? await readFile(file.tempFilePath)
        : null;
  if (!buffer) throw new APIError('Arquivo vazio.', 400);

  const detected = detectMarketplaceFileType(buffer);
  if (!detected) {
    throw new APIError('Formato não permitido. Use JPEG, PNG, WebP (imagem) ou PDF (ficha técnica).', 400);
  }

  const data = (args as { data?: Record<string, unknown> }).data ?? {};
  const kind = data.kind === 'datasheet' ? 'datasheet' : 'image';
  if (kind === 'image' && detected.kind !== 'image') {
    throw new APIError('Imagens devem ser JPEG, PNG ou WebP.', 400);
  }
  if (kind === 'datasheet' && detected.kind !== 'pdf') {
    throw new APIError('A ficha técnica deve ser um PDF.', 400);
  }
  const max = kind === 'image' ? MARKETPLACE_IMAGE_MAX_BYTES : MARKETPLACE_DATASHEET_MAX_BYTES;
  if (buffer.length > max) {
    throw new APIError(`Arquivo acima do limite de ${Math.round(max / (1024 * 1024))} MB.`, 413);
  }

  file.name = `mk-${randomUUID()}.${detected.ext}`;
  file.mimetype = detected.mime;
  data.kind = kind;
  return args;
};

/** Imagens e fichas técnicas de anúncios do Marketplace. Separado de `media` (acadêmico). */
export const PartnerListingMedia: CollectionConfig = {
  slug: 'partner-listing-media',
  labels: { singular: 'Arquivo de anúncio', plural: 'Arquivos de anúncios' },
  admin: {
    useAsTitle: 'alt',
    group: GROUP,
    defaultColumns: ['filename', 'kind', 'partner', 'public', 'updatedAt'],
    description: 'Imagens e fichas técnicas enviadas por parceiros. Públicas só quando anexadas a anúncio publicado.',
  },
  upload: {
    staticDir: path.join(resolveMediaStaticDir(), 'marketplace'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  access: {
    read: listingMediaRead,
    create: partnerMembershipCreateAccess('edit'),
    update: partnerMembershipScopedAccess('edit'),
    delete: partnerMembershipScopedAccess('manage'),
  },
  hooks: {
    beforeOperation: [validateListingUpload],
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user && !hasStaffAccess(req.user)) {
          data.uploadedBy = req.user.id;
          data.public = false;
        }
        if (operation === 'create' && getRelationId(data.partner) == null) {
          throw new APIError('Parceiro obrigatório.', 400);
        }
        return data;
      },
    ],
  },
  fields: [
    { name: 'alt', type: 'text', label: 'Texto alternativo', maxLength: 160 },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'image',
      index: true,
      label: 'Tipo',
      options: [
        { label: 'Imagem', value: 'image' },
        { label: 'Ficha técnica (PDF)', value: 'datasheet' },
      ],
      access: { update: staffFieldAccess },
    },
    {
      name: 'partner',
      type: 'relationship',
      relationTo: 'partners',
      required: true,
      index: true,
      label: 'Parceiro',
      access: { update: staffFieldAccess },
    },
    {
      name: 'public',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: 'Público',
      access: { create: staffFieldAccess, update: staffFieldAccess },
      admin: { description: 'Sincronizado automaticamente com o status do anúncio.' },
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Enviado por',
      admin: { readOnly: true },
    },
  ],
};
