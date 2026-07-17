import type {
  Access,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  TextFieldSingleValidation,
} from 'payload';

import { createPublishingFields } from '../fields/publishing';
import { createSeoFields } from '../fields/seo';

const authenticated: Access = ({ req: { user } }) => Boolean(user);

const PORTAL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizePortalSlug = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized === '' ? null : normalized;
};

const validatePortalSlug: TextFieldSingleValidation = (value) => {
  if (!value) {
    return true;
  }
  if (typeof value !== 'string' || !PORTAL_SLUG_PATTERN.test(value)) {
    return 'Use apenas letras minúsculas, números e hífen.';
  }
  return true;
};

const normalizePortalSlugHook: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) {
    return data;
  }
  const normalized = normalizePortalSlug(data.portalSlug ?? data.slug);
  if (normalized) {
    data.portalSlug = normalized;
  }
  return data;
};

const setPublishedAtOnPublish: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (!data) {
    return data;
  }

  const nextStatus =
    typeof data.status === 'string'
      ? data.status
      : typeof originalDoc?.status === 'string'
        ? originalDoc.status
        : null;

  if (nextStatus === 'active') {
    const existingPublishedAt =
      data.publishedAt ??
      (typeof originalDoc?.publishedAt === 'string' || originalDoc?.publishedAt instanceof Date
        ? originalDoc.publishedAt
        : null);

    if (!existingPublishedAt) {
      data.publishedAt = new Date().toISOString();
    }
  }

  return data;
};

const titledItemFields = [
  {
    name: 'title',
    type: 'text' as const,
    required: true,
    label: 'Título',
  },
  {
    name: 'description',
    type: 'textarea' as const,
    label: 'Descrição',
  },
];

/**
 * Empresas do ecossistema Omnia Frigo.
 * Sprint 06: páginas estratégicas no hub (/empresas/[portalSlug]).
 */
export const Companies: CollectionConfig = {
  slug: 'companies',
  labels: {
    singular: 'Empresa',
    plural: 'Empresas',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'portalSlug', 'ecosystemRole', 'displayOrder', 'status'],
    group: 'Multiempresa',
    description: 'Empresas do ecossistema e páginas estratégicas do Portal.',
  },
  timestamps: true,
  access: {
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    beforeValidate: [normalizePortalSlugHook],
    beforeChange: [setPublishedAtOnPublish],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identidade',
          fields: [
            {
              name: 'tenant',
              type: 'relationship',
              relationTo: 'tenants',
              label: 'Tenant',
            },
            {
              name: 'name',
              type: 'text',
              required: true,
              label: 'Nome',
            },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              label: 'Slug interno',
              admin: {
                description: 'Identificador estável da empresa (sites, integrações).',
              },
            },
            {
              name: 'portalSlug',
              type: 'text',
              required: true,
              unique: true,
              label: 'Slug no Portal',
              validate: validatePortalSlug,
              admin: {
                description: 'Rota pública /empresas/[slug]. Ex.: renovacao, fred-do-frio.',
              },
            },
            {
              name: 'shortDescription',
              type: 'textarea',
              required: true,
              label: 'Descrição curta',
            },
            {
              name: 'positioning',
              type: 'textarea',
              label: 'Posicionamento',
              admin: {
                description: 'Frase de posicionamento estratégico no ecossistema.',
              },
            },
            {
              name: 'ecosystemRole',
              type: 'text',
              required: true,
              label: 'Papel no ecossistema',
              admin: {
                description: 'Ex.: Engenharia, Educação, Formação Técnica, Tecnologia, Holding',
              },
            },
            {
              name: 'isHolding',
              type: 'checkbox',
              defaultValue: false,
              label: 'É a Holding',
            },
            {
              name: 'showInEcosystem',
              type: 'checkbox',
              defaultValue: true,
              label: 'Exibir no ecossistema',
              admin: {
                description: 'Quando ativo, aparece nos cards de /empresas e Home.',
              },
            },
            {
              name: 'brandTheme',
              type: 'select',
              defaultValue: 'omnia',
              options: [
                { label: 'Omnia (institucional)', value: 'omnia' },
                { label: 'Renovação (engenharia)', value: 'renovacao' },
                { label: 'Fred do Frio (educação)', value: 'fred' },
                { label: 'CTE (formação técnica)', value: 'cte' },
                { label: 'Neurofrigo (tech/IA)', value: 'neurofrigo' },
              ],
              label: 'Tema visual',
            },
            {
              name: 'displayOrder',
              type: 'number',
              required: true,
              defaultValue: 0,
              label: 'Ordem de exibição',
            },
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'active',
              options: [
                { label: 'Ativo', value: 'active' },
                { label: 'Inativo', value: 'inactive' },
              ],
              label: 'Status operacional',
            },
            {
              name: 'externalSite',
              type: 'text',
              label: 'Site externo',
            },
          ],
        },
        {
          label: 'Conteúdo',
          fields: [
            {
              name: 'institutionalText',
              type: 'textarea',
              label: 'Texto institucional',
            },
            {
              name: 'fullDescription',
              type: 'richText',
              label: 'Descrição completa (rich text)',
            },
            {
              name: 'mission',
              type: 'textarea',
              label: 'Missão',
            },
            {
              name: 'vision',
              type: 'textarea',
              label: 'Visão',
            },
            {
              name: 'values',
              type: 'array',
              label: 'Valores',
              labels: { singular: 'Valor', plural: 'Valores' },
              fields: titledItemFields,
            },
            {
              name: 'differentiators',
              type: 'array',
              label: 'Diferenciais',
              labels: { singular: 'Diferencial', plural: 'Diferenciais' },
              fields: titledItemFields,
            },
            {
              name: 'authorityStats',
              type: 'array',
              label: 'Números e provas',
              labels: { singular: 'Número', plural: 'Números' },
              fields: [
                {
                  name: 'value',
                  type: 'text',
                  required: true,
                  label: 'Valor',
                },
                {
                  name: 'label',
                  type: 'text',
                  required: true,
                  label: 'Rótulo',
                },
              ],
            },
            {
              name: 'offerings',
              type: 'array',
              label: 'Produtos e serviços',
              labels: { singular: 'Oferta', plural: 'Ofertas' },
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
                  label: 'Descrição',
                },
                {
                  name: 'kind',
                  type: 'select',
                  defaultValue: 'service',
                  options: [
                    { label: 'Serviço', value: 'service' },
                    { label: 'Produto', value: 'product' },
                    { label: 'Curso', value: 'course' },
                    { label: 'Solução', value: 'solution' },
                  ],
                  label: 'Tipo',
                },
              ],
            },
            {
              name: 'audiences',
              type: 'array',
              label: 'Públicos atendidos',
              labels: { singular: 'Público', plural: 'Públicos' },
              fields: titledItemFields,
            },
          ],
        },
        {
          label: 'Mídia e CTAs',
          fields: [
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              label: 'Logotipo',
            },
            {
              name: 'coverImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Imagem principal',
            },
            {
              name: 'gallery',
              type: 'array',
              label: 'Galeria',
              labels: { singular: 'Imagem', plural: 'Imagens' },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                  label: 'Imagem',
                },
                {
                  name: 'caption',
                  type: 'text',
                  label: 'Legenda',
                },
              ],
            },
            {
              name: 'primaryCta',
              type: 'group',
              label: 'CTA principal',
              fields: [
                { name: 'label', type: 'text', label: 'Rótulo' },
                { name: 'href', type: 'text', label: 'URL' },
              ],
            },
            {
              name: 'secondaryCta',
              type: 'group',
              label: 'CTA secundário',
              fields: [
                { name: 'label', type: 'text', label: 'Rótulo' },
                { name: 'href', type: 'text', label: 'URL' },
              ],
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'seo',
              type: 'group',
              label: 'SEO',
              fields: createSeoFields(),
            },
          ],
        },
        {
          label: 'Publicação',
          fields: createPublishingFields(),
        },
      ],
    },
  ],
};
