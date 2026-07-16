import type { Block } from 'payload';

import { FEATURES_BLOCK_MAX_ITEMS, FEATURES_ICON_KEYS, HERO_BLOCK_VARIANTS } from '@omnia/shared';

const linkActionFields = [
  {
    name: 'label',
    type: 'text' as const,
    label: 'Rótulo',
  },
  {
    name: 'href',
    type: 'text' as const,
    label: 'URL ou âncora',
    admin: {
      description: 'Caminho interno (/...), âncora (#...) ou URL http(s).',
    },
  },
];

export const HeroBlock: Block = {
  slug: 'hero',
  labels: {
    singular: 'Hero',
    plural: 'Hero',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Eyebrow (opcional)',
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Título',
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Subtítulo',
    },
    {
      name: 'primaryAction',
      type: 'group',
      label: 'Ação principal',
      fields: linkActionFields,
      admin: {
        description: 'Opcional. Deixe vazio se não houver CTA.',
      },
    },
    {
      name: 'secondaryAction',
      type: 'group',
      label: 'Ação secundária',
      fields: linkActionFields,
    },
    {
      name: 'variant',
      type: 'select',
      required: true,
      defaultValue: 'default',
      label: 'Variante',
      options: HERO_BLOCK_VARIANTS.map((value) => ({
        label: value,
        value,
      })),
    },
  ],
};

export const FeaturesBlock: Block = {
  slug: 'features',
  labels: {
    singular: 'Features',
    plural: 'Features',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Título da seção',
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Subtítulo',
    },
    {
      name: 'columns',
      type: 'select',
      required: true,
      defaultValue: '3',
      label: 'Colunas',
      options: [
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3', value: '3' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: FEATURES_BLOCK_MAX_ITEMS,
      label: 'Itens',
      labels: {
        singular: 'Item',
        plural: 'Itens',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Título',
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          label: 'Descrição',
        },
        {
          name: 'iconKey',
          type: 'select',
          label: 'Ícone (allowlist)',
          options: FEATURES_ICON_KEYS.map((value) => ({
            label: value,
            value,
          })),
        },
      ],
    },
  ],
};

export const CompaniesBlock: Block = {
  slug: 'companies',
  labels: {
    singular: 'Empresas',
    plural: 'Empresas',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Título da seção',
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Subtítulo',
    },
    {
      name: 'limit',
      type: 'number',
      required: true,
      defaultValue: 6,
      min: 1,
      max: 20,
      label: 'Limite de empresas',
      admin: {
        description: 'Dados vêm do endpoint público de Companies. Máximo 20.',
      },
    },
    {
      name: 'showRole',
      type: 'checkbox',
      defaultValue: true,
      label: 'Exibir papel (ecosystemRole)',
    },
    {
      name: 'showDescription',
      type: 'checkbox',
      defaultValue: true,
      label: 'Exibir descrição',
    },
    {
      name: 'layout',
      type: 'select',
      required: true,
      defaultValue: 'grid',
      label: 'Layout',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Lista', value: 'list' },
      ],
    },
  ],
};

export const pageBlocks = [HeroBlock, FeaturesBlock, CompaniesBlock];
