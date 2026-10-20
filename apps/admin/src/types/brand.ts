export const BRAND_STATUSES = ['draft', 'active', 'inactive', 'archived'] as const;

export type BrandStatus = (typeof BRAND_STATUSES)[number];

export const BRAND_CATEGORIES = [
  'holding',
  'engineering',
  'education',
  'technology',
  'software',
  'marketplace',
  'services',
  'future_business',
] as const;

export type BrandCategory = (typeof BRAND_CATEGORIES)[number];

export type BrandAssetReference = {
  logoPrimary?: string;
  logoHorizontal?: string;
  logoVertical?: string;
  logoLight?: string;
  logoDark?: string;
  symbol?: string;
  favicon?: string;
  socialImage?: string;
};

export const OFFICIAL_LINK_TYPES = [
  'website',
  'instagram',
  'facebook',
  'linkedin',
  'youtube',
  'whatsapp',
  'catalog',
  'customerPortal',
  'studentPortal',
  'application',
  'documentation',
  'download',
] as const;

export type OfficialLinkType = (typeof OFFICIAL_LINK_TYPES)[number];

export type OfficialLink = {
  type: OfficialLinkType;
  label: string;
  url: string;
  isPrimary: boolean;
  openInNewTab: boolean;
};

export type BrandReference = {
  id: string;
  name: string;
  slug: string;
  status: BrandStatus;
  category: BrandCategory;
  companyId: string;
  shortDescription?: string;
  assets?: BrandAssetReference;
  officialLinks?: OfficialLink[];
};
