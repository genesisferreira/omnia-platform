/**
 * Páginas institucionais canônicas do site omnia-hub (Missão 01).
 * Seed idempotente — cria somente se o slug ainda não existir; nunca sobrescreve.
 */

import { holdingHomeInstitutionalBlocks } from './holding-home-institutional';

export const HOLDING_INSTITUTIONAL_SITE_SLUG = 'omnia-hub';

export type InstitutionalPageSeedDecision =
  | { action: 'create' }
  | { action: 'skip'; reason: 'slug_exists'; detail: string }
  | { action: 'abort'; reason: 'site_not_found'; detail: string };

export type ExistingPageProbe = {
  id: string | number;
  slug: string;
  pageType: string;
};

export const decideInstitutionalPageSeed = (args: {
  siteFound: boolean;
  siteSlug: string;
  pageSlug: string;
  existingBySlug: ExistingPageProbe | null;
}): InstitutionalPageSeedDecision => {
  if (!args.siteFound) {
    return {
      action: 'abort',
      reason: 'site_not_found',
      detail: `Site "${args.siteSlug}" não encontrado. Execute o seed de sites antes.`,
    };
  }

  if (args.existingBySlug) {
    return {
      action: 'skip',
      reason: 'slug_exists',
      detail: `Página "${args.pageSlug}" já existe (id=${args.existingBySlug.id}, pageType=${args.existingBySlug.pageType}).`,
    };
  }

  return { action: 'create' };
};

const [introBlock, missionVisionBlock, valuesBlock] = holdingHomeInstitutionalBlocks;

export const holdingInstitutionalPagesSeed = [
  {
    title: 'Sobre a Omnia Frigo Holding',
    slug: 'sobre',
    pageType: 'standard' as const,
    seo: {
      metaTitle: 'Sobre | Omnia Frigo Holding',
      metaDescription:
        'Conheça a Omnia Frigo Holding: missão, visão e valores do ecossistema de refrigeração.',
      canonicalUrl: null as string | null,
      noIndex: false,
    },
    layout: [
      {
        blockType: 'hero' as const,
        title: 'Sobre a Omnia Frigo Holding',
        subtitle: 'Tradição, Educação e Inteligência Artificial em Refrigeração.',
        primaryAction: {
          label: 'Conheça as empresas',
          href: '/empresas',
        },
        secondaryAction: {
          label: 'Fale conosco',
          href: '/contato',
        },
        variant: 'default' as const,
      },
      introBlock,
      missionVisionBlock,
      valuesBlock,
    ],
  },
  {
    title: 'Empresas do ecossistema',
    slug: 'empresas',
    pageType: 'standard' as const,
    seo: {
      metaTitle: 'Empresas | Omnia Frigo Holding',
      metaDescription: 'Conheça as marcas que compõem o ecossistema Omnia Frigo Holding.',
      canonicalUrl: null as string | null,
      noIndex: false,
    },
    layout: [
      {
        blockType: 'hero' as const,
        title: 'Empresas do ecossistema',
        subtitle: 'Holding, serviços, tecnologia, educação e engenharia em uma única plataforma.',
        primaryAction: {
          label: 'Voltar ao início',
          href: '/',
        },
        secondaryAction: {
          label: 'Sobre a Holding',
          href: '/sobre',
        },
        variant: 'default' as const,
      },
      {
        blockType: 'companies' as const,
        title: 'Marcas do ecossistema',
        subtitle: 'Conheça as empresas que integram a Omnia Frigo Holding.',
        limit: 6,
        showRole: true,
        showDescription: true,
        layout: 'grid' as const,
      },
    ],
  },
  {
    title: 'Contato',
    slug: 'contato',
    pageType: 'standard' as const,
    seo: {
      metaTitle: 'Contato | Omnia Frigo Holding',
      metaDescription: 'Entre em contato com a Omnia Frigo Holding.',
      canonicalUrl: null as string | null,
      noIndex: false,
    },
    layout: [
      {
        blockType: 'hero' as const,
        title: 'Contato',
        subtitle: 'Fale com a equipe da Omnia Frigo Holding.',
        primaryAction: {
          label: 'Conheça o ecossistema',
          href: '/#ecossistema',
        },
        secondaryAction: {
          label: 'Sobre a Holding',
          href: '/sobre',
        },
        variant: 'default' as const,
      },
      {
        blockType: 'institutionalIntro' as const,
        eyebrow: 'Atendimento',
        title: 'Estamos à disposição',
        body: 'Para assuntos institucionais da Holding, utilize o canal administrativo do portal ou o e-mail de contato configurado nas preferências globais do CMS. Em breve, formulário e canais dedicados estarão disponíveis nesta página.',
        highlights: [
          { text: 'Holding institucional' },
          { text: 'Ecossistema multiempresa' },
          { text: 'Educação e tecnologia' },
        ],
      },
    ],
  },
] as const;
