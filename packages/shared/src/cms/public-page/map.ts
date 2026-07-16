import {
  COMPANIES_BLOCK_DEFAULT_LIMIT,
  COMPANIES_BLOCK_LAYOUTS,
  COMPANIES_BLOCK_MAX_LIMIT,
  FEATURES_BLOCK_COLUMNS,
  FEATURES_BLOCK_MAX_ITEMS,
  FEATURES_BLOCK_MIN_ITEMS,
  FEATURES_ICON_KEYS,
  HERO_BLOCK_VARIANTS,
  INSTITUTIONAL_INTRO_MAX_BODY,
  INSTITUTIONAL_INTRO_MAX_EYEBROW,
  INSTITUTIONAL_INTRO_MAX_HIGHLIGHT_LENGTH,
  INSTITUTIONAL_INTRO_MAX_HIGHLIGHTS,
  INSTITUTIONAL_INTRO_MAX_TITLE,
  MISSION_VISION_MAX_BODY,
  MISSION_VISION_MAX_TITLE,
  MISSION_VISION_MAX_YEAR,
  PUBLIC_PAGE_MAX_BLOCKS,
  PUBLIC_PAGE_TYPES,
  VALUES_BLOCK_MAX_ITEMS,
  VALUES_BLOCK_MIN_ITEMS,
  VALUES_ICON_KEYS,
  type CompaniesBlockLayout,
  type FeaturesBlockColumns,
  type FeaturesIconKey,
  type HeroBlockVariant,
  type PublicPageType,
  type ValuesIconKey,
} from './constants';
import {
  isPlainRecord,
  readBoundedStringArray,
  readBoundedTrimmedString,
  readOptionalTrimmedString,
  readRequiredTrimmedString,
  sanitizePublicCanonicalUrl,
  sanitizePublicHref,
} from './sanitize';
import type {
  PublicCompaniesBlockDto,
  PublicFeatureItemDto,
  PublicFeaturesBlockDto,
  PublicHeroBlockDto,
  PublicInstitutionalIntroBlockDto,
  PublicMissionVisionBlockDto,
  PublicPageBlockDto,
  PublicPageDto,
  PublicPageSeoDto,
  PublicValueItemDto,
  PublicValuesBlockDto,
} from './types';

const KNOWN_BLOCK_TYPES = new Set([
  'hero',
  'institutionalIntro',
  'missionVision',
  'values',
  'features',
  'companies',
]);

const includesLiteral = <T extends string | number>(
  list: readonly T[],
  value: unknown,
): value is T => (list as readonly unknown[]).includes(value);

const readBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
};

const isEmptyLinkAction = (value: unknown): boolean => {
  if (!isPlainRecord(value)) {
    return false;
  }

  return (
    readOptionalTrimmedString(value.label) === null &&
    readOptionalTrimmedString(value.href) === null
  );
};

const mapLinkAction = (value: unknown): PublicHeroBlockDto['primaryAction'] => {
  if (value === null || value === undefined) {
    return null;
  }

  if (!isPlainRecord(value)) {
    return null;
  }

  if (isEmptyLinkAction(value)) {
    return null;
  }

  const label = readRequiredTrimmedString(value.label);
  const href = sanitizePublicHref(value.href);

  if (!label || !href) {
    return null;
  }

  return { label, href };
};

const mapHeroBlock = (value: Record<string, unknown>): PublicHeroBlockDto | null => {
  const title = readRequiredTrimmedString(value.title);
  if (!title) {
    return null;
  }

  const variantRaw = value.variant;
  const variant: HeroBlockVariant = includesLiteral(HERO_BLOCK_VARIANTS, variantRaw)
    ? variantRaw
    : 'default';

  const primaryRaw = value.primaryAction;
  const primaryAction =
    primaryRaw === null || primaryRaw === undefined || isEmptyLinkAction(primaryRaw)
      ? null
      : mapLinkAction(primaryRaw);
  if (
    primaryRaw !== null &&
    primaryRaw !== undefined &&
    !isEmptyLinkAction(primaryRaw) &&
    primaryAction === null
  ) {
    return null;
  }

  const secondaryRaw = value.secondaryAction;
  const secondaryAction =
    secondaryRaw === null || secondaryRaw === undefined || isEmptyLinkAction(secondaryRaw)
      ? null
      : mapLinkAction(secondaryRaw);
  if (
    secondaryRaw !== null &&
    secondaryRaw !== undefined &&
    !isEmptyLinkAction(secondaryRaw) &&
    secondaryAction === null
  ) {
    return null;
  }

  return {
    blockType: 'hero',
    eyebrow: readOptionalTrimmedString(value.eyebrow),
    title,
    subtitle: readOptionalTrimmedString(value.subtitle),
    primaryAction,
    secondaryAction,
    variant,
  };
};

const mapInstitutionalIntroBlock = (
  value: Record<string, unknown>,
): PublicInstitutionalIntroBlockDto | null => {
  const title = readBoundedTrimmedString(value.title, INSTITUTIONAL_INTRO_MAX_TITLE, true);
  const body = readBoundedTrimmedString(value.body, INSTITUTIONAL_INTRO_MAX_BODY, true);
  if (!title || !body) {
    return null;
  }

  const eyebrow = readBoundedTrimmedString(value.eyebrow, INSTITUTIONAL_INTRO_MAX_EYEBROW);
  let highlights: string[] = [];
  if (value.highlights !== null && value.highlights !== undefined) {
    if (!Array.isArray(value.highlights)) {
      return null;
    }
    if (value.highlights.length > INSTITUTIONAL_INTRO_MAX_HIGHLIGHTS) {
      return null;
    }
    for (const entry of value.highlights) {
      if (typeof entry === 'string') {
        const trimmed = readBoundedTrimmedString(
          entry,
          INSTITUTIONAL_INTRO_MAX_HIGHLIGHT_LENGTH,
          true,
        );
        if (!trimmed) return null;
        highlights.push(trimmed);
        continue;
      }
      if (isPlainRecord(entry)) {
        const trimmed = readBoundedTrimmedString(
          entry.text,
          INSTITUTIONAL_INTRO_MAX_HIGHLIGHT_LENGTH,
          true,
        );
        if (!trimmed) return null;
        highlights.push(trimmed);
        continue;
      }
      return null;
    }
  }

  return {
    blockType: 'institutionalIntro',
    eyebrow,
    title,
    body,
    highlights,
  };
};

const mapMissionVisionBlock = (
  value: Record<string, unknown>,
): PublicMissionVisionBlockDto | null => {
  const missionTitle = readBoundedTrimmedString(value.missionTitle, MISSION_VISION_MAX_TITLE, true);
  const missionBody = readBoundedTrimmedString(value.missionBody, MISSION_VISION_MAX_BODY, true);
  const visionTitle = readBoundedTrimmedString(value.visionTitle, MISSION_VISION_MAX_TITLE, true);
  const visionBody = readBoundedTrimmedString(value.visionBody, MISSION_VISION_MAX_BODY, true);
  if (!missionTitle || !missionBody || !visionTitle || !visionBody) {
    return null;
  }

  const visionYear = readBoundedTrimmedString(value.visionYear, MISSION_VISION_MAX_YEAR);

  return {
    blockType: 'missionVision',
    missionTitle,
    missionBody,
    visionTitle,
    visionBody,
    visionYear,
  };
};

const mapValueItem = (value: unknown): PublicValueItemDto | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const title = readBoundedTrimmedString(value.title, INSTITUTIONAL_INTRO_MAX_TITLE, true);
  if (!title) {
    return null;
  }

  const description = readBoundedTrimmedString(
    value.description,
    INSTITUTIONAL_INTRO_MAX_BODY,
    false,
  );

  let iconKey: ValuesIconKey | null = null;
  if (value.iconKey !== null && value.iconKey !== undefined) {
    iconKey = includesLiteral(VALUES_ICON_KEYS, value.iconKey) ? value.iconKey : null;
  }

  return { title, description, iconKey };
};

const mapValuesBlock = (value: Record<string, unknown>): PublicValuesBlockDto | null => {
  if (!Array.isArray(value.items)) {
    return null;
  }

  if (value.items.length < VALUES_BLOCK_MIN_ITEMS || value.items.length > VALUES_BLOCK_MAX_ITEMS) {
    return null;
  }

  const items: PublicValueItemDto[] = [];
  for (const item of value.items) {
    const mapped = mapValueItem(item);
    if (!mapped) {
      return null;
    }
    items.push(mapped);
  }

  return {
    blockType: 'values',
    title: readBoundedTrimmedString(value.title, INSTITUTIONAL_INTRO_MAX_TITLE),
    subtitle: readBoundedTrimmedString(value.subtitle, INSTITUTIONAL_INTRO_MAX_BODY),
    items,
  };
};

const mapFeatureItem = (value: unknown): PublicFeatureItemDto | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const title = readRequiredTrimmedString(value.title);
  const description = readRequiredTrimmedString(value.description);
  if (!title || !description) {
    return null;
  }

  let iconKey: FeaturesIconKey | null = null;
  if (value.iconKey !== null && value.iconKey !== undefined) {
    if (!includesLiteral(FEATURES_ICON_KEYS, value.iconKey)) {
      return null;
    }
    iconKey = value.iconKey;
  }

  return { title, description, iconKey };
};

const mapFeaturesBlock = (value: Record<string, unknown>): PublicFeaturesBlockDto | null => {
  if (!Array.isArray(value.items)) {
    return null;
  }

  if (
    value.items.length < FEATURES_BLOCK_MIN_ITEMS ||
    value.items.length > FEATURES_BLOCK_MAX_ITEMS
  ) {
    return null;
  }

  const items: PublicFeatureItemDto[] = [];
  for (const item of value.items) {
    const mapped = mapFeatureItem(item);
    if (!mapped) {
      return null;
    }
    items.push(mapped);
  }

  const columnsRaw =
    typeof value.columns === 'string' && /^\d+$/.test(value.columns)
      ? Number(value.columns)
      : value.columns;
  const columns: FeaturesBlockColumns = includesLiteral(FEATURES_BLOCK_COLUMNS, columnsRaw)
    ? columnsRaw
    : 3;

  return {
    blockType: 'features',
    title: readOptionalTrimmedString(value.title),
    subtitle: readOptionalTrimmedString(value.subtitle),
    items,
    columns,
  };
};

const normalizeCompaniesLimit = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return COMPANIES_BLOCK_DEFAULT_LIMIT;
  }

  const floored = Math.floor(value);
  if (floored < 1) {
    return 1;
  }
  if (floored > COMPANIES_BLOCK_MAX_LIMIT) {
    return COMPANIES_BLOCK_MAX_LIMIT;
  }
  return floored;
};

const mapCompaniesBlock = (value: Record<string, unknown>): PublicCompaniesBlockDto | null => {
  const layoutRaw = value.layout;
  const layout: CompaniesBlockLayout = includesLiteral(COMPANIES_BLOCK_LAYOUTS, layoutRaw)
    ? layoutRaw
    : 'grid';

  return {
    blockType: 'companies',
    title: readOptionalTrimmedString(value.title),
    subtitle: readOptionalTrimmedString(value.subtitle),
    limit: normalizeCompaniesLimit(value.limit),
    showRole: readBoolean(value.showRole, true),
    showDescription: readBoolean(value.showDescription, true),
    layout,
  };
};

/**
 * Mapeia um bloco público.
 * `blockType` desconhecido → `null` (ignorado de forma determinística pelo mapeador de página).
 * Bloco conhecido inválido → `null` (rejeitado).
 */
export const mapPublicPageBlock = (value: unknown): PublicPageBlockDto | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const blockType = value.blockType;
  if (blockType === 'hero') {
    return mapHeroBlock(value);
  }
  if (blockType === 'institutionalIntro') {
    return mapInstitutionalIntroBlock(value);
  }
  if (blockType === 'missionVision') {
    return mapMissionVisionBlock(value);
  }
  if (blockType === 'values') {
    return mapValuesBlock(value);
  }
  if (blockType === 'features') {
    return mapFeaturesBlock(value);
  }
  if (blockType === 'companies') {
    return mapCompaniesBlock(value);
  }

  return null;
};

export const mapPublicPageBlocks = (value: unknown): PublicPageBlockDto[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  if (value.length > PUBLIC_PAGE_MAX_BLOCKS) {
    return null;
  }

  const blocks: PublicPageBlockDto[] = [];
  for (const entry of value) {
    if (!isPlainRecord(entry)) {
      return null;
    }

    const blockType = entry.blockType;
    if (typeof blockType !== 'string' || !KNOWN_BLOCK_TYPES.has(blockType)) {
      continue;
    }

    const mapped = mapPublicPageBlock(entry);
    if (!mapped) {
      return null;
    }
    blocks.push(mapped);
  }

  return blocks;
};

const mapSeo = (value: unknown): PublicPageSeoDto | null => {
  if (value === null || value === undefined) {
    return {
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      noIndex: false,
    };
  }

  if (!isPlainRecord(value)) {
    return null;
  }

  let canonicalUrl: string | null = null;
  if (value.canonicalUrl !== null && value.canonicalUrl !== undefined) {
    canonicalUrl = sanitizePublicCanonicalUrl(value.canonicalUrl);
    if (canonicalUrl === null && readOptionalTrimmedString(value.canonicalUrl) !== null) {
      return null;
    }
  }

  return {
    metaTitle: readOptionalTrimmedString(value.metaTitle),
    metaDescription: readOptionalTrimmedString(value.metaDescription),
    canonicalUrl,
    noIndex: readBoolean(value.noIndex, false),
  };
};

/**
 * Constrói o DTO público mínimo de página.
 * Não faz spread de documentos Payload — apenas campos allowlist.
 */
export const mapPublicPage = (value: unknown): PublicPageDto | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const id = readRequiredTrimmedString(value.id);
  const title = readRequiredTrimmedString(value.title);
  const slug = readRequiredTrimmedString(value.slug);
  if (!id || !title || !slug) {
    return null;
  }

  if (!includesLiteral(PUBLIC_PAGE_TYPES, value.pageType)) {
    return null;
  }
  const pageType: PublicPageType = value.pageType;

  if (!isPlainRecord(value.site)) {
    return null;
  }
  const siteId = readRequiredTrimmedString(value.site.id);
  const siteSlug = readRequiredTrimmedString(value.site.slug);
  if (!siteId || !siteSlug) {
    return null;
  }

  const blocks = mapPublicPageBlocks(value.blocks);
  if (!blocks) {
    return null;
  }

  const seo = mapSeo(value.seo);
  if (!seo) {
    return null;
  }

  return {
    id,
    site: { id: siteId, slug: siteSlug },
    title,
    slug,
    pageType,
    blocks,
    seo,
  };
};
