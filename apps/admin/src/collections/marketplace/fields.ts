import type { Field, FieldAccess, Option } from 'payload';

import {
  LISTING_STATUS_VALUES,
  MARKETPLACE_CURRENCY,
  MARKETPLACE_LISTING_MAX_IMAGES,
  MEMBERSHIP_ROLE_VALUES,
  MEMBERSHIP_STATUS_VALUES,
  PRICE_MODE_VALUES,
  PROPOSAL_STATUS_VALUES,
  QUOTE_EVENT_TYPE_VALUES,
  QUOTE_EVENT_VISIBILITY_VALUES,
  QUOTE_SOURCE_TYPE_VALUES,
  QUOTE_STATUS_VALUES,
} from '@omnia/shared';

import { hasStaffAccess } from '../../access/rbac';

export const GROUP = 'Marketplace B2B';

export const staffFieldAccess: FieldAccess = ({ req: { user } }) => hasStaffAccess(user);

export const staffOnlyFieldAccess = {
  create: staffFieldAccess,
  update: staffFieldAccess,
} as const;

function options(values: readonly string[], labels: Record<string, string>): Option[] {
  return values.map((value) => ({ value, label: labels[value] ?? value }));
}

export const MEMBERSHIP_ROLE_OPTIONS = options(MEMBERSHIP_ROLE_VALUES, {
  owner: 'Proprietário',
  manager: 'Gerente',
  editor: 'Editor',
  viewer: 'Visualizador',
});

export const MEMBERSHIP_STATUS_OPTIONS = options(MEMBERSHIP_STATUS_VALUES, {
  invited: 'Convidado',
  active: 'Ativo',
  revoked: 'Revogado',
});

export const LISTING_STATUS_OPTIONS = options(LISTING_STATUS_VALUES, {
  draft: 'Rascunho',
  pending: 'Em moderação',
  published: 'Publicado',
  rejected: 'Rejeitado',
  suspended: 'Suspenso',
  archived: 'Arquivado',
});

export const PRICE_MODE_OPTIONS = options(PRICE_MODE_VALUES, {
  fixed: 'Preço fixo',
  starting_at: 'A partir de',
  on_request: 'Sob consulta',
});

export const QUOTE_SOURCE_OPTIONS = options(QUOTE_SOURCE_TYPE_VALUES, {
  product: 'Produto',
  service: 'Serviço',
  project: 'Projeto',
});

export const QUOTE_STATUS_OPTIONS = options(QUOTE_STATUS_VALUES, {
  submitted: 'Enviada',
  in_review: 'Em análise',
  proposal_sent: 'Proposta enviada',
  negotiating: 'Em negociação',
  accepted: 'Aceita',
  declined: 'Recusada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
});

export const PROPOSAL_STATUS_OPTIONS = options(PROPOSAL_STATUS_VALUES, {
  draft: 'Rascunho',
  sent: 'Enviada',
  accepted: 'Aceita',
  rejected: 'Rejeitada',
  withdrawn: 'Retirada',
  expired: 'Expirada',
});

export const QUOTE_EVENT_TYPE_OPTIONS = options(QUOTE_EVENT_TYPE_VALUES, {
  request_created: 'Solicitação criada',
  status_changed: 'Status alterado',
  message: 'Mensagem',
  proposal_created: 'Proposta criada',
  proposal_sent: 'Proposta enviada',
  proposal_accepted: 'Proposta aceita',
  proposal_rejected: 'Proposta rejeitada',
  proposal_withdrawn: 'Proposta retirada',
  note: 'Nota interna',
});

export const QUOTE_EVENT_VISIBILITY_OPTIONS = options(QUOTE_EVENT_VISIBILITY_VALUES, {
  internal: 'Interno (parceiro/staff)',
  shared: 'Compartilhado com o comprador',
});

const dateTimeAdmin = { date: { pickerAppearance: 'dayAndTime' as const } };

export function listingFields(kind: 'product' | 'service'): Field[] {
  const isProduct = kind === 'product';
  return [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Título',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      label: 'Slug',
      admin: {
        description: 'Gerado a partir do título; único por parceiro (/parceiros/{parceiro}/{slug}).',
      },
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
      name: 'category',
      type: 'text',
      index: true,
      label: 'Categoria',
    },
    ...(isProduct
      ? ([
          { name: 'brand', type: 'text', index: true, label: 'Marca' },
          { name: 'model', type: 'text', label: 'Modelo' },
          { name: 'sku', type: 'text', index: true, label: 'SKU' },
        ] as Field[])
      : []),
    {
      name: 'description',
      type: 'textarea',
      label: 'Descrição',
    },
    {
      name: 'priceMode',
      type: 'select',
      required: true,
      defaultValue: 'on_request',
      label: 'Modo de preço',
      options: PRICE_MODE_OPTIONS,
    },
    {
      name: 'price',
      type: 'number',
      min: 0,
      label: 'Preço (centavos)',
      admin: {
        description: 'Valor em centavos de real (ex.: 12990 = R$ 129,90). Vazio quando sob consulta.',
      },
    },
    {
      name: 'currency',
      type: 'text',
      required: true,
      defaultValue: MARKETPLACE_CURRENCY,
      label: 'Moeda',
      admin: { readOnly: true },
    },
    {
      name: 'images',
      type: 'array',
      label: 'Imagens',
      labels: { singular: 'Imagem', plural: 'Imagens' },
      maxRows: MARKETPLACE_LISTING_MAX_IMAGES,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'partner-listing-media',
          required: true,
          label: 'Imagem',
          filterOptions: ({ data }) => ({ kind: { equals: 'image' }, partner: { equals: data?.partner } }),
        },
        { name: 'alt', type: 'text', label: 'Texto alternativo', maxLength: 160 },
      ],
    },
    {
      name: 'datasheet',
      type: 'upload',
      relationTo: 'partner-listing-media',
      label: 'Ficha técnica (PDF)',
      filterOptions: ({ data }) => ({ kind: { equals: 'datasheet' }, partner: { equals: data?.partner } }),
    },
    ...(isProduct
      ? ([
          {
            name: 'seo',
            type: 'group',
            label: 'SEO',
            fields: [
              { name: 'title', type: 'text', label: 'Título SEO' },
              { name: 'description', type: 'textarea', label: 'Descrição SEO' },
            ],
          },
        ] as Field[])
      : []),
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      label: 'Status',
      options: LISTING_STATUS_OPTIONS,
      admin: {
        position: 'sidebar',
        description:
          'Parceiro: rascunho, em moderação ou arquivado. Publicar, rejeitar e suspender: somente staff.',
      },
    },
    {
      name: 'moderationNotes',
      type: 'textarea',
      label: 'Notas de moderação',
      access: staffOnlyFieldAccess,
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Publicado em',
      access: staffOnlyFieldAccess,
      admin: { position: 'sidebar', ...dateTimeAdmin },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Criado por',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Atualizado por',
      admin: { position: 'sidebar', readOnly: true },
    },
  ];
}
