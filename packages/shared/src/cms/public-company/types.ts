import type { PublicCompanyBrandTheme, PublicCompanyOfferingKind } from './constants';

export type PublicCompanyMediaDto = {
  url: string;
  alt: string | null;
};

export type PublicCompanySeoDto = {
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  noFollow: boolean;
  openGraphTitle: string | null;
  openGraphDescription: string | null;
  openGraphImage: PublicCompanyMediaDto | null;
  schemaType: string | null;
};

export type PublicCompanyCtaDto = {
  label: string;
  href: string;
};

export type PublicCompanyTitledItemDto = {
  title: string;
  description: string | null;
};

export type PublicCompanyStatDto = {
  value: string;
  label: string;
};

export type PublicCompanyOfferingDto = {
  title: string;
  description: string | null;
  kind: PublicCompanyOfferingKind;
};

export type PublicCompanyListItemDto = {
  id: string;
  name: string;
  slug: string;
  portalSlug: string;
  shortDescription: string;
  positioning: string | null;
  ecosystemRole: string;
  brandTheme: PublicCompanyBrandTheme;
  displayOrder: number;
  externalSite: string | null;
  applicationUrl: string | null;
  logo: PublicCompanyMediaDto | null;
  coverImage: PublicCompanyMediaDto | null;
  primaryCta: PublicCompanyCtaDto | null;
};

export type PublicCompanyDto = PublicCompanyListItemDto & {
  institutionalText: string | null;
  mission: string | null;
  vision: string | null;
  values: PublicCompanyTitledItemDto[];
  differentiators: PublicCompanyTitledItemDto[];
  authorityStats: PublicCompanyStatDto[];
  offerings: PublicCompanyOfferingDto[];
  audiences: PublicCompanyTitledItemDto[];
  gallery: Array<PublicCompanyMediaDto & { caption: string | null }>;
  secondaryCta: PublicCompanyCtaDto | null;
  seo: PublicCompanySeoDto;
  siblings: PublicCompanyListItemDto[];
};
