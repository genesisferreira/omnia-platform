/**
 * Execução isolada do seed das páginas institucionais (omnia-hub).
 * Cria somente páginas ausentes — nunca sobrescreve conteúdo editorial.
 */

import {
  decideInstitutionalPageSeed,
  HOLDING_INSTITUTIONAL_SITE_SLUG,
  holdingInstitutionalPagesSeed,
  type ExistingPageProbe,
} from './holding-institutional-pages';

export type InstitutionalPageSeedItemOutcome =
  | { slug: string; status: 'created'; pageId: string | number }
  | { slug: string; status: 'skipped'; reason: 'slug_exists' }
  | { slug: string; status: 'aborted'; reason: 'site_not_found' };

export type HoldingInstitutionalPagesSeedOutcome = {
  siteSlug: string;
  items: InstitutionalPageSeedItemOutcome[];
};

type FindResult = { docs: Array<{ id: string | number; slug?: unknown; pageType?: unknown }> };

export type InstitutionalPagesFindArgs = {
  collection: 'sites' | 'pages';
  where?: unknown;
  limit?: number;
  depth?: number;
  overrideAccess?: boolean;
};

export type InstitutionalPagesCreateArgs = {
  collection: 'pages';
  overrideAccess?: boolean;
  data: Record<string, unknown>;
};

export type HoldingInstitutionalPagesSeedPayload = {
  find: (args: InstitutionalPagesFindArgs) => Promise<FindResult>;
  create: (args: InstitutionalPagesCreateArgs) => Promise<{ id: string | number }>;
};

export const adaptPayloadForInstitutionalPagesSeed = (payload: {
  find: unknown;
  create: unknown;
}): HoldingInstitutionalPagesSeedPayload => ({
  find: (args) => (payload.find as HoldingInstitutionalPagesSeedPayload['find'])(args),
  create: (args) => (payload.create as HoldingInstitutionalPagesSeedPayload['create'])(args),
});

const toProbe = (doc: FindResult['docs'][number] | undefined): ExistingPageProbe | null => {
  if (!doc) return null;
  return {
    id: doc.id,
    slug: String(doc.slug ?? ''),
    pageType: String(doc.pageType ?? ''),
  };
};

export async function runHoldingInstitutionalPagesSeed(
  payload: HoldingInstitutionalPagesSeedPayload,
): Promise<HoldingInstitutionalPagesSeedOutcome> {
  const siteResult = await payload.find({
    collection: 'sites',
    where: { slug: { equals: HOLDING_INSTITUTIONAL_SITE_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const siteDoc = siteResult.docs[0];
  const items: InstitutionalPageSeedItemOutcome[] = [];

  for (const pageSeed of holdingInstitutionalPagesSeed) {
    if (!siteDoc) {
      items.push({ slug: pageSeed.slug, status: 'aborted', reason: 'site_not_found' });
      continue;
    }

    const existingBySlug = await payload.find({
      collection: 'pages',
      where: {
        and: [{ site: { equals: siteDoc.id } }, { slug: { equals: pageSeed.slug } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    const decision = decideInstitutionalPageSeed({
      siteFound: true,
      siteSlug: HOLDING_INSTITUTIONAL_SITE_SLUG,
      pageSlug: pageSeed.slug,
      existingBySlug: toProbe(existingBySlug.docs[0]),
    });

    if (decision.action === 'skip') {
      items.push({ slug: pageSeed.slug, status: 'skipped', reason: 'slug_exists' });
      continue;
    }

    const created = await payload.create({
      collection: 'pages',
      overrideAccess: true,
      data: {
        title: pageSeed.title,
        slug: pageSeed.slug,
        pageType: pageSeed.pageType,
        site: siteDoc.id,
        layout: pageSeed.layout,
        seo: pageSeed.seo,
        _status: 'published',
      },
    });

    items.push({ slug: pageSeed.slug, status: 'created', pageId: created.id });
  }

  return { siteSlug: HOLDING_INSTITUTIONAL_SITE_SLUG, items };
}

export const formatHoldingInstitutionalPagesSeedLog = (
  outcome: HoldingInstitutionalPagesSeedOutcome,
): string => {
  const parts = outcome.items.map((item) => {
    switch (item.status) {
      case 'created':
        return `${item.slug}:created`;
      case 'skipped':
        return `${item.slug}:skipped:${item.reason}`;
      case 'aborted':
        return `${item.slug}:aborted:${item.reason}`;
      default: {
        const _exhaustive: never = item;
        return _exhaustive;
      }
    }
  });

  return `holding-institutional-pages: ${parts.join(',')}`;
};

export const hasInstitutionalPagesSeedAbort = (
  outcome: HoldingInstitutionalPagesSeedOutcome,
): boolean => outcome.items.some((item) => item.status === 'aborted');
