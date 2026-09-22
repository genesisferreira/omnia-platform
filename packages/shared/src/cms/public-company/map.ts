import {
  PUBLIC_COMPANY_BRAND_THEMES,
  PUBLIC_COMPANY_HOLDING_SLUG,
  PUBLIC_COMPANY_OFFERING_KINDS,
  type PublicCompanyBrandTheme,
  type PublicCompanyOfferingKind,
} from './constants';
import type {
  PublicCompanyCtaDto,
  PublicCompanyDto,
  PublicCompanyListItemDto,
  PublicCompanyMediaDto,
  PublicCompanyOfferingDto,
  PublicCompanySeoDto,
  PublicCompanyStatDto,
  PublicCompanyTitledItemDto,
} from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const LOGO_INTERNAL_BASE = 'https://omnia.internal';

export const sanitizeExternalSite = (value: unknown): string | null => {
  const trimmed = readString(value);
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
};

export const sanitizeMediaUrl = (value: unknown): string | null => {
  const trimmed = readString(value);
  if (!trimmed || trimmed.includes('\\') || trimmed.startsWith('//')) {
    return null;
  }

  if (trimmed.startsWith('/')) {
    try {
      const base = new URL(LOGO_INTERNAL_BASE);
      const parsed = new URL(trimmed, base);
      if (parsed.origin !== base.origin) {
        return null;
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.username !== '' || parsed.password !== '') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
};

export const mapPublicCompanyMedia = (value: unknown): PublicCompanyMediaDto | null => {
  if (!isRecord(value)) {
    return null;
  }
  const url = sanitizeMediaUrl(value.url);
  if (!url) {
    return null;
  }
  return {
    url,
    alt: readString(value.alt),
  };
};

const mapCta = (value: unknown): PublicCompanyCtaDto | null => {
  if (!isRecord(value)) {
    return null;
  }
  const label = readString(value.label);
  const href = readString(value.href);
  if (!label || !href) {
    return null;
  }
  if (href.startsWith('/')) {
    return { label, href };
  }
  const external = sanitizeExternalSite(href);
  return external ? { label, href: external } : null;
};

const mapBrandTheme = (value: unknown): PublicCompanyBrandTheme => {
  if (
    typeof value === 'string' &&
    (PUBLIC_COMPANY_BRAND_THEMES as readonly string[]).includes(value)
  ) {
    return value as PublicCompanyBrandTheme;
  }
  return 'omnia';
};

const mapOfferingKind = (value: unknown): PublicCompanyOfferingKind => {
  if (
    typeof value === 'string' &&
    (PUBLIC_COMPANY_OFFERING_KINDS as readonly string[]).includes(value)
  ) {
    return value as PublicCompanyOfferingKind;
  }
  return 'service';
};

const mapTitledItems = (value: unknown): PublicCompanyTitledItemDto[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const title = readString(item.title);
      if (!title) {
        return null;
      }
      return {
        title,
        description: readString(item.description),
      };
    })
    .filter((item): item is PublicCompanyTitledItemDto => item !== null);
};

const mapStats = (value: unknown): PublicCompanyStatDto[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const statValue = readString(item.value);
      const label = readString(item.label);
      if (!statValue || !label) {
        return null;
      }
      return { value: statValue, label };
    })
    .filter((item): item is PublicCompanyStatDto => item !== null);
};

const mapOfferings = (value: unknown): PublicCompanyOfferingDto[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const title = readString(item.title);
      if (!title) {
        return null;
      }
      return {
        title,
        description: readString(item.description),
        kind: mapOfferingKind(item.kind),
      };
    })
    .filter((item): item is PublicCompanyOfferingDto => item !== null);
};

const mapGallery = (value: unknown): Array<PublicCompanyMediaDto & { caption: string | null }> => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const media = mapPublicCompanyMedia(item.image ?? item);
      if (!media) {
        return null;
      }
      return {
        ...media,
        caption: readString(item.caption),
      };
    })
    .filter((item): item is PublicCompanyMediaDto & { caption: string | null } => item !== null);
};

const mapSeo = (value: unknown): PublicCompanySeoDto => {
  const seo = isRecord(value) ? value : {};
  return {
    metaTitle: readString(seo.metaTitle),
    metaDescription: readString(seo.metaDescription),
    canonicalUrl: sanitizeExternalSite(seo.canonicalUrl),
    noIndex: seo.noIndex === true,
    noFollow: seo.noFollow === true,
    openGraphTitle: readString(seo.openGraphTitle),
    openGraphDescription: readString(seo.openGraphDescription),
    openGraphImage: mapPublicCompanyMedia(seo.openGraphImage),
    schemaType: readString(seo.schemaType),
  };
};

const normalizeDisplayOrder = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
};

const isPubliclyVisible = (doc: Record<string, unknown>, now = new Date()): boolean => {
  if (doc.status !== 'active') {
    return false;
  }
  if (doc.publishAt) {
    const publishAt = new Date(String(doc.publishAt)).getTime();
    if (!Number.isNaN(publishAt) && publishAt > now.getTime()) {
      return false;
    }
  }
  if (doc.unpublishAt) {
    const unpublishAt = new Date(String(doc.unpublishAt)).getTime();
    if (!Number.isNaN(unpublishAt) && unpublishAt <= now.getTime()) {
      return false;
    }
  }
  return true;
};

export const mapPublicCompanyListItem = (doc: unknown): PublicCompanyListItemDto | null => {
  if (!isRecord(doc) || !isPubliclyVisible(doc)) {
    return null;
  }

  if (doc.isHolding === true || doc.showInEcosystem === false) {
    return null;
  }

  const slug = readString(doc.slug);
  const portalSlug = readString(doc.portalSlug) ?? slug;
  if (!slug || !portalSlug || slug === PUBLIC_COMPANY_HOLDING_SLUG) {
    return null;
  }

  const name = readString(doc.name);
  const shortDescription = readString(doc.shortDescription);
  const ecosystemRole = readString(doc.ecosystemRole);
  if (!name || !shortDescription || !ecosystemRole) {
    return null;
  }

  const rawId = doc.id;
  if (typeof rawId !== 'string' && typeof rawId !== 'number') {
    return null;
  }
  const id = String(rawId).trim();
  if (!id) {
    return null;
  }

  return {
    id,
    name,
    slug,
    portalSlug,
    shortDescription,
    positioning: readString(doc.positioning),
    ecosystemRole,
    brandTheme: mapBrandTheme(doc.brandTheme),
    displayOrder: normalizeDisplayOrder(doc.displayOrder),
    externalSite: sanitizeExternalSite(doc.externalSite),
    applicationUrl: sanitizeExternalSite(doc.applicationUrl),
    logo: mapPublicCompanyMedia(doc.logo),
    coverImage: mapPublicCompanyMedia(doc.coverImage),
    primaryCta: mapCta(doc.primaryCta),
  };
};

export const mapPublicCompanyDetail = (
  doc: unknown,
  siblings: PublicCompanyListItemDto[] = [],
): PublicCompanyDto | null => {
  if (!isRecord(doc) || !isPubliclyVisible(doc)) {
    return null;
  }

  const slug = readString(doc.slug);
  const portalSlug = readString(doc.portalSlug) ?? slug;
  if (!slug || !portalSlug || slug === PUBLIC_COMPANY_HOLDING_SLUG || doc.isHolding === true) {
    return null;
  }

  const name = readString(doc.name);
  const shortDescription = readString(doc.shortDescription);
  const ecosystemRole = readString(doc.ecosystemRole);
  if (!name || !shortDescription || !ecosystemRole) {
    return null;
  }

  const rawId = doc.id;
  if (typeof rawId !== 'string' && typeof rawId !== 'number') {
    return null;
  }
  const id = String(rawId).trim();
  if (!id) {
    return null;
  }

  return {
    id,
    name,
    slug,
    portalSlug,
    shortDescription,
    positioning: readString(doc.positioning),
    ecosystemRole,
    brandTheme: mapBrandTheme(doc.brandTheme),
    displayOrder: normalizeDisplayOrder(doc.displayOrder),
    externalSite: sanitizeExternalSite(doc.externalSite),
    applicationUrl: sanitizeExternalSite(doc.applicationUrl),
    logo: mapPublicCompanyMedia(doc.logo),
    coverImage: mapPublicCompanyMedia(doc.coverImage),
    primaryCta: mapCta(doc.primaryCta),
    institutionalText: readString(doc.institutionalText),
    mission: readString(doc.mission),
    vision: readString(doc.vision),
    values: mapTitledItems(doc.values),
    differentiators: mapTitledItems(doc.differentiators),
    authorityStats: mapStats(doc.authorityStats),
    offerings: mapOfferings(doc.offerings),
    audiences: mapTitledItems(doc.audiences),
    gallery: mapGallery(doc.gallery),
    secondaryCta: mapCta(doc.secondaryCta),
    seo: mapSeo(doc.seo),
    siblings: siblings.filter((item) => item.id !== id),
  };
};

export const sortPublicCompaniesByDisplayOrder = <
  T extends { displayOrder: number; portalSlug: string },
>(
  companies: T[],
): T[] =>
  [...companies].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.portalSlug.localeCompare(b.portalSlug);
  });
