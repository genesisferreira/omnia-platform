/** Limites e allowlists do DTO público de páginas / blocos. */

export const PUBLIC_PAGE_MAX_BLOCKS = 20;
export const FEATURES_BLOCK_MAX_ITEMS = 12;
export const FEATURES_BLOCK_MIN_ITEMS = 1;

/** Alinhado ao teto do endpoint public-companies. */
export const COMPANIES_BLOCK_DEFAULT_LIMIT = 6;
export const COMPANIES_BLOCK_MAX_LIMIT = 20;

export const PUBLIC_PAGE_TYPES = ['home', 'standard'] as const;
export type PublicPageType = (typeof PUBLIC_PAGE_TYPES)[number];

export const HERO_BLOCK_VARIANTS = ['default', 'compact', 'emphasis'] as const;
export type HeroBlockVariant = (typeof HERO_BLOCK_VARIANTS)[number];

export const FEATURES_BLOCK_COLUMNS = [1, 2, 3] as const;
export type FeaturesBlockColumns = (typeof FEATURES_BLOCK_COLUMNS)[number];

export const FEATURES_ICON_KEYS = [
  'multiempresa',
  'cms',
  'design',
  'education',
  'engineering',
  'technology',
  'services',
] as const;
export type FeaturesIconKey = (typeof FEATURES_ICON_KEYS)[number];

export const COMPANIES_BLOCK_LAYOUTS = ['grid', 'list'] as const;
export type CompaniesBlockLayout = (typeof COMPANIES_BLOCK_LAYOUTS)[number];

export const INSTITUTIONAL_INTRO_MAX_HIGHLIGHTS = 4;
export const INSTITUTIONAL_INTRO_MAX_TITLE = 120;
export const INSTITUTIONAL_INTRO_MAX_EYEBROW = 80;
export const INSTITUTIONAL_INTRO_MAX_BODY = 2000;
export const INSTITUTIONAL_INTRO_MAX_HIGHLIGHT_LENGTH = 120;

export const MISSION_VISION_MAX_TITLE = 80;
export const MISSION_VISION_MAX_BODY = 1500;
export const MISSION_VISION_MAX_YEAR = 20;

export const VALUES_BLOCK_MIN_ITEMS = 1;
export const VALUES_BLOCK_MAX_ITEMS = 6;
export const VALUES_ICON_KEYS = [
  'ethics',
  'partnership',
  'excellence',
  'innovation',
  'customer',
  'results',
] as const;
export type ValuesIconKey = (typeof VALUES_ICON_KEYS)[number];

export const PUBLIC_BLOCK_TYPES = [
  'hero',
  'institutionalIntro',
  'missionVision',
  'values',
  'features',
  'companies',
] as const;
export type PublicBlockType = (typeof PUBLIC_BLOCK_TYPES)[number];
