import type {
  CompaniesBlockLayout,
  FeaturesBlockColumns,
  FeaturesIconKey,
  HeroBlockVariant,
  PublicPageType,
} from './constants';

export type PublicLinkActionDto = {
  label: string;
  href: string;
};

export type PublicHeroBlockDto = {
  blockType: 'hero';
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  primaryAction: PublicLinkActionDto | null;
  secondaryAction: PublicLinkActionDto | null;
  variant: HeroBlockVariant;
};

export type PublicFeatureItemDto = {
  title: string;
  description: string;
  iconKey: FeaturesIconKey | null;
};

export type PublicFeaturesBlockDto = {
  blockType: 'features';
  title: string | null;
  subtitle: string | null;
  items: PublicFeatureItemDto[];
  columns: FeaturesBlockColumns;
};

/**
 * Somente configuração da seção.
 * Empresas vêm do endpoint público mínimo `/api/omnia/public-companies`.
 */
export type PublicCompaniesBlockDto = {
  blockType: 'companies';
  title: string | null;
  subtitle: string | null;
  limit: number;
  showRole: boolean;
  showDescription: boolean;
  layout: CompaniesBlockLayout;
};

export type PublicPageBlockDto =
  PublicHeroBlockDto | PublicFeaturesBlockDto | PublicCompaniesBlockDto;

export type PublicPageSeoDto = {
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
};

export type PublicPageSiteRefDto = {
  id: string;
  slug: string;
};

export type PublicPageDto = {
  id: string;
  site: PublicPageSiteRefDto;
  title: string;
  slug: string;
  pageType: PublicPageType;
  blocks: PublicPageBlockDto[];
  seo: PublicPageSeoDto;
};
