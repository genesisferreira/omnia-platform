import type { Block } from 'payload';

import {
  FEATURES_BLOCK_MAX_ITEMS,
  FEATURES_ICON_KEYS,
  HERO_BLOCK_VARIANTS,
  INSTITUTIONAL_INTRO_MAX_BODY,
  INSTITUTIONAL_INTRO_MAX_EYEBROW,
  INSTITUTIONAL_INTRO_MAX_HIGHLIGHTS,
  INSTITUTIONAL_INTRO_MAX_HIGHLIGHT_LENGTH,
  INSTITUTIONAL_INTRO_MAX_TITLE,
  MISSION_VISION_MAX_BODY,
  MISSION_VISION_MAX_TITLE,
  MISSION_VISION_MAX_YEAR,
  VALUES_BLOCK_MAX_ITEMS,
  VALUES_ICON_KEYS,
} from '@omnia/shared';

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

export const InstitutionalIntroBlock: Block = {
  slug: 'institutionalIntro',
  labels: {
    singular: 'Intro institucional',
    plural: 'Intro institucional',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Eyebrow (opcional)',
      maxLength: INSTITUTIONAL_INTRO_MAX_EYEBROW,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Título',
      maxLength: INSTITUTIONAL_INTRO_MAX_TITLE,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      label: 'Corpo',
      maxLength: INSTITUTIONAL_INTRO_MAX_BODY,
    },
    {
      name: 'highlights',
      type: 'array',
      label: 'Destaques (opcional)',
      maxRows: INSTITUTIONAL_INTRO_MAX_HIGHLIGHTS,
      labels: { singular: 'Destaque', plural: 'Destaques' },
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
          label: 'Texto',
          maxLength: INSTITUTIONAL_INTRO_MAX_HIGHLIGHT_LENGTH,
        },
      ],
    },
  ],
};

export const MissionVisionBlock: Block = {
  slug: 'missionVision',
  labels: {
    singular: 'Missão e Visão',
    plural: 'Missão e Visão',
  },
  fields: [
    {
      name: 'missionTitle',
      type: 'text',
      required: true,
      label: 'Título da missão',
      maxLength: MISSION_VISION_MAX_TITLE,
    },
    {
      name: 'missionBody',
      type: 'textarea',
      required: true,
      label: 'Corpo da missão',
      maxLength: MISSION_VISION_MAX_BODY,
    },
    {
      name: 'visionTitle',
      type: 'text',
      required: true,
      label: 'Título da visão',
      maxLength: MISSION_VISION_MAX_TITLE,
    },
    {
      name: 'visionBody',
      type: 'textarea',
      required: true,
      label: 'Corpo da visão',
      maxLength: MISSION_VISION_MAX_BODY,
    },
    {
      name: 'visionYear',
      type: 'text',
      label: 'Ano da visão (opcional)',
      maxLength: MISSION_VISION_MAX_YEAR,
    },
  ],
};

export const ValuesBlock: Block = {
  slug: 'values',
  labels: {
    singular: 'Valores',
    plural: 'Valores',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Título da seção',
      maxLength: INSTITUTIONAL_INTRO_MAX_TITLE,
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Subtítulo',
      maxLength: INSTITUTIONAL_INTRO_MAX_BODY,
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: VALUES_BLOCK_MAX_ITEMS,
      label: 'Valores',
      labels: { singular: 'Valor', plural: 'Valores' },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Título',
          maxLength: INSTITUTIONAL_INTRO_MAX_TITLE,
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Descrição (opcional)',
          maxLength: INSTITUTIONAL_INTRO_MAX_BODY,
        },
        {
          name: 'iconKey',
          type: 'select',
          label: 'Ícone (allowlist)',
          options: VALUES_ICON_KEYS.map((value) => ({
            label: value,
            value,
          })),
        },
      ],
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

export const pageBlocks = [
  HeroBlock,
  InstitutionalIntroBlock,
  MissionVisionBlock,
  ValuesBlock,
  FeaturesBlock,
  CompaniesBlock,
];
