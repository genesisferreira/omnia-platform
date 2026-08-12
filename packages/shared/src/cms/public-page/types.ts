import type {
  CompaniesBlockLayout,
  FeaturesBlockColumns,
  FeaturesIconKey,
  HeroBlockVariant,
  PublicPageType,
  ValuesIconKey,
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

export type PublicInstitutionalIntroBlockDto = {
  blockType: 'institutionalIntro';
  eyebrow: string | null;
  title: string;
  body: string;
  highlights: string[];
};

export type PublicMissionVisionBlockDto = {
  blockType: 'missionVision';
  missionTitle: string;
  missionBody: string;
  visionTitle: string;
  visionBody: string;
  visionYear: string | null;
};

export type PublicValueItemDto = {
  title: string;
  description: string | null;
  iconKey: ValuesIconKey | null;
};

export type PublicValuesBlockDto = {
  blockType: 'values';
  title: string | null;
  subtitle: string | null;
  items: PublicValueItemDto[];
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
  | PublicHeroBlockDto
  | PublicInstitutionalIntroBlockDto
  | PublicMissionVisionBlockDto
  | PublicValuesBlockDto
  | PublicFeaturesBlockDto
  | PublicCompaniesBlockDto;

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
