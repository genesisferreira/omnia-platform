/**
 * Seed idempotente da Home do site omnia-hub (S04-F4C / F4C.2).
 * Nunca sobrescreve conteúdo editorial existente — use upgrade-holding-home para evolução.
 */

import {
  holdingHomeFullLayout,
  holdingHomeInstitutionalBlocks,
} from './holding-home-institutional';

export type HoldingHomeSeedDecision =
  | { action: 'create' }
  | { action: 'skip'; reason: 'home_exists' | 'slug_home_occupied'; detail: string }
  | { action: 'abort'; reason: 'site_not_found'; detail: string };

export type ExistingPageProbe = {
  id: string | number;
  slug: string;
  pageType: string;
};

/**
 * Decide se o seed deve criar, ignorar ou abortar — sem efeitos colaterais.
 */
export const decideHoldingHomeSeed = (args: {
  siteFound: boolean;
  siteSlug: string;
  existingHome: ExistingPageProbe | null;
  existingBySlugHome: ExistingPageProbe | null;
}): HoldingHomeSeedDecision => {
  if (!args.siteFound) {
    return {
      action: 'abort',
      reason: 'site_not_found',
      detail: `Site "${args.siteSlug}" não encontrado. Execute o seed de sites antes.`,
    };
  }

  if (args.existingHome) {
    return {
      action: 'skip',
      reason: 'home_exists',
      detail: `Home já existe (id=${args.existingHome.id}, slug=${args.existingHome.slug}).`,
    };
  }

  if (args.existingBySlugHome && args.existingBySlugHome.pageType !== 'home') {
    return {
      action: 'skip',
      reason: 'slug_home_occupied',
      detail: `Slug "home" já ocupado por página pageType=${args.existingBySlugHome.pageType} (id=${args.existingBySlugHome.id}). Seed não sobrescreve.`,
    };
  }

  return { action: 'create' };
};

export const holdingHomeSeed = {
  title: 'Home Omnia Hub',
  slug: 'home',
  pageType: 'home' as const,
  siteSlug: 'omnia-hub',
  seo: {
    metaTitle: 'Omnia Frigo Holding',
    metaDescription: 'Tradição, Educação e Inteligência Artificial em Refrigeração.',
    canonicalUrl: null as string | null,
    noIndex: false,
  },
  layout: [...holdingHomeFullLayout],
};

export { holdingHomeInstitutionalBlocks, holdingHomeFullLayout };
