/**
 * Comparação e upgrade idempotente da Home institucional (S04-F6).
 * Atua somente na collection Pages.
 */

import {
  HOLDING_HOME_BASELINE_BLOCK_TYPES,
  HOLDING_HOME_FULL_BLOCK_TYPES,
  holdingHomeBaselineLayout,
  holdingHomeFullLayout,
  holdingHomeInstitutionalBlocks,
} from './holding-home-institutional';
import { holdingHomeSeed } from './holding-home';

export type HoldingHomeUpgradeOutcome =
  | { status: 'created'; pageId: string | number }
  | { status: 'upgraded'; pageId: string | number }
  | { status: 'skipped'; reason: 'already_current' }
  | { status: 'aborted'; reason: 'site_not_found' | 'manual_review_required' };

type LayoutBlock = Record<string, unknown> & { blockType: string };

export type HoldingHomeUpgradePayload = {
  find: (args: {
    collection: 'sites' | 'pages';
    where?: unknown;
    limit?: number;
    depth?: number;
    overrideAccess?: boolean;
  }) => Promise<{ docs: Array<Record<string, unknown> & { id: string | number }> }>;
  create: (args: {
    collection: 'pages';
    overrideAccess?: boolean;
    data: Record<string, unknown>;
  }) => Promise<{ id: string | number }>;
  update: (args: {
    collection: 'pages';
    id: string | number;
    overrideAccess?: boolean;
    data: Record<string, unknown>;
  }) => Promise<{ id: string | number }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t === '' ? null : t;
};

const normalizeHighlights = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string') {
      const t = normalizeString(entry);
      if (t) out.push(t);
      continue;
    }
    if (isRecord(entry)) {
      const t = normalizeString(entry.text);
      if (t) out.push(t);
    }
  }
  return out;
};

const normalizeBlock = (block: unknown): LayoutBlock | null => {
  if (!isRecord(block) || typeof block.blockType !== 'string') return null;
  return block as LayoutBlock;
};

export const getLayoutBlockTypes = (layout: unknown): string[] => {
  if (!Array.isArray(layout)) return [];
  return layout.map((b) => normalizeBlock(b)?.blockType).filter((t): t is string => Boolean(t));
};

const blockFingerprint = (block: LayoutBlock): string => {
  const type = block.blockType;
  if (type === 'hero') {
    return `hero:${normalizeString(block.title)}:${normalizeString(block.subtitle)}:${normalizeString((block.primaryAction as { label?: string })?.label)}`;
  }
  if (type === 'features') {
    const items = Array.isArray(block.items)
      ? block.items.map((i) =>
          isRecord(i) ? `${normalizeString(i.title)}|${normalizeString(i.description)}` : '',
        )
      : [];
    return `features:${normalizeString(block.title)}:${items.join(';')}`;
  }
  if (type === 'companies') {
    return `companies:${normalizeString(block.title)}:${String(block.limit ?? '')}`;
  }
  if (type === 'institutionalIntro') {
    return `intro:${normalizeString(block.title)}:${normalizeString(block.body)}:${normalizeHighlights(block.highlights).join('|')}`;
  }
  if (type === 'missionVision') {
    return `mv:${normalizeString(block.missionTitle)}:${normalizeString(block.visionTitle)}`;
  }
  if (type === 'values') {
    const items = Array.isArray(block.items)
      ? block.items.map((i) => (isRecord(i) ? normalizeString(i.title) : ''))
      : [];
    return `values:${normalizeString(block.title)}:${items.join('|')}`;
  }
  return type;
};

export const layoutFingerprint = (layout: unknown): string => {
  if (!Array.isArray(layout)) return '';
  return layout
    .map((b) => {
      const block = normalizeBlock(b);
      return block ? blockFingerprint(block) : '?';
    })
    .join('||');
};

export const baselineLayoutFingerprint = (): string =>
  layoutFingerprint([...holdingHomeBaselineLayout]);

export const fullLayoutFingerprint = (): string => layoutFingerprint([...holdingHomeFullLayout]);

export const buildUpgradedLayout = (baselineLayout: unknown[]): unknown[] => {
  const hero = baselineLayout.find((b) => normalizeBlock(b)?.blockType === 'hero');
  const features = baselineLayout.find((b) => normalizeBlock(b)?.blockType === 'features');
  const companies = baselineLayout.find((b) => normalizeBlock(b)?.blockType === 'companies');
  if (!hero || !features || !companies) {
    throw new Error('baseline_blocks_missing');
  }
  return [hero, ...holdingHomeInstitutionalBlocks, features, companies];
};

export const adaptPayloadForHoldingHomeUpgrade = (payload: {
  find: unknown;
  create: unknown;
  update: unknown;
}): HoldingHomeUpgradePayload => ({
  find: (args) => (payload.find as HoldingHomeUpgradePayload['find'])(args),
  create: (args) => (payload.create as HoldingHomeUpgradePayload['create'])(args),
  update: (args) => (payload.update as HoldingHomeUpgradePayload['update'])(args),
});

/**
 * Cria, atualiza ou ignora a Home omnia-hub conforme baseline/estado atual.
 */
export async function runHoldingHomeUpgrade(
  payload: HoldingHomeUpgradePayload,
): Promise<HoldingHomeUpgradeOutcome> {
  const homeSite = await payload.find({
    collection: 'sites',
    where: { slug: { equals: holdingHomeSeed.siteSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const homeSiteDoc = homeSite.docs[0];
  if (!homeSiteDoc) {
    return { status: 'aborted', reason: 'site_not_found' };
  }

  const existingHome = await payload.find({
    collection: 'pages',
    where: {
      and: [{ site: { equals: homeSiteDoc.id } }, { pageType: { equals: 'home' } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const homeDoc = existingHome.docs[0];

  if (!homeDoc) {
    const created = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: holdingHomeSeed.title,
        slug: holdingHomeSeed.slug,
        pageType: holdingHomeSeed.pageType,
        site: homeSiteDoc.id,
        layout: [...holdingHomeFullLayout],
        seo: holdingHomeSeed.seo,
        _status: 'published',
      },
    });
    return { status: 'created', pageId: created.id };
  }

  const types = getLayoutBlockTypes(homeDoc.layout);
  const fp = layoutFingerprint(homeDoc.layout);

  if (
    types.length === HOLDING_HOME_FULL_BLOCK_TYPES.length &&
    types.every((t, i) => t === HOLDING_HOME_FULL_BLOCK_TYPES[i]) &&
    fp === fullLayoutFingerprint()
  ) {
    return { status: 'skipped', reason: 'already_current' };
  }

  if (
    types.length === HOLDING_HOME_BASELINE_BLOCK_TYPES.length &&
    types.every((t, i) => t === HOLDING_HOME_BASELINE_BLOCK_TYPES[i]) &&
    fp === baselineLayoutFingerprint()
  ) {
    const upgradedLayout = buildUpgradedLayout(homeDoc.layout as unknown[]);
    await payload.update({
      collection: 'pages',
      id: homeDoc.id,
      overrideAccess: true,
      data: {
        layout: upgradedLayout,
        _status: 'published',
      },
    });
    return { status: 'upgraded', pageId: homeDoc.id };
  }

  return { status: 'aborted', reason: 'manual_review_required' };
}

export const formatHoldingHomeUpgradeLog = (outcome: HoldingHomeUpgradeOutcome): string => {
  switch (outcome.status) {
    case 'created':
      return 'holding-home-upgrade: created';
    case 'upgraded':
      return 'holding-home-upgrade: upgraded';
    case 'skipped':
      return 'holding-home-upgrade: skipped: already_current';
    case 'aborted':
      return `holding-home-upgrade: aborted: ${outcome.reason}`;
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
};
