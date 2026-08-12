/**
 * Execução isolada do seed da Home (omnia-hub).
 * Sem tenants, companies, sites, domains ou global-settings.
 */

import { decideHoldingHomeSeed, holdingHomeSeed, type ExistingPageProbe } from './holding-home';

export type HoldingHomeSeedOutcome =
  | { status: 'created'; pageId: string | number }
  | { status: 'skipped'; reason: 'home_exists' | 'slug_home_occupied' }
  | { status: 'aborted'; reason: 'site_not_found' };

type PageProbeDoc = ExistingPageProbe & { pageType?: string; slug?: string };

type FindResult = { docs: Array<{ id: string | number; slug?: unknown; pageType?: unknown }> };

/** Args mínimos — `collection` literal para isolamento testável. */
export type HoldingHomeFindArgs = {
  collection: 'sites' | 'pages';
  where?: unknown;
  limit?: number;
  depth?: number;
  overrideAccess?: boolean;
};

export type HoldingHomeCreateArgs = {
  collection: 'pages';
  overrideAccess?: boolean;
  data: Record<string, unknown>;
};

/** Superfície mínima do Payload usada pelo seed exclusivo da Home. */
export type HoldingHomeSeedPayload = {
  find: (args: HoldingHomeFindArgs) => Promise<FindResult>;
  create: (args: HoldingHomeCreateArgs) => Promise<{ id: string | number }>;
};

/**
 * Adapta a API real do Payload à porta estreita (evita acoplar testes ao BasePayload).
 */
export const adaptPayloadForHoldingHomeSeed = (payload: {
  find: unknown;
  create: unknown;
}): HoldingHomeSeedPayload => ({
  find: (args) => (payload.find as HoldingHomeSeedPayload['find'])(args),
  create: (args) => (payload.create as HoldingHomeSeedPayload['create'])(args),
});

const toProbe = (doc: FindResult['docs'][number] | undefined): ExistingPageProbe | null => {
  if (!doc) return null;
  return {
    id: doc.id,
    slug: String(doc.slug ?? ''),
    pageType: String(doc.pageType ?? ''),
  };
};

/**
 * Localiza omnia-hub, decide create/skip/abort e cria no máximo uma Page published.
 * Nunca chama create/update em outras collections.
 */
export async function runHoldingHomeSeed(
  payload: HoldingHomeSeedPayload,
): Promise<HoldingHomeSeedOutcome> {
  const homeSite = await payload.find({
    collection: 'sites',
    where: { slug: { equals: holdingHomeSeed.siteSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const homeSiteDoc = homeSite.docs[0];

  const existingHome = homeSiteDoc
    ? await payload.find({
        collection: 'pages',
        where: {
          and: [{ site: { equals: homeSiteDoc.id } }, { pageType: { equals: 'home' } }],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
    : { docs: [] as PageProbeDoc[] };

  const existingBySlugHome = homeSiteDoc
    ? await payload.find({
        collection: 'pages',
        where: {
          and: [{ site: { equals: homeSiteDoc.id } }, { slug: { equals: holdingHomeSeed.slug } }],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
    : { docs: [] as PageProbeDoc[] };

  const decision = decideHoldingHomeSeed({
    siteFound: Boolean(homeSiteDoc),
    siteSlug: holdingHomeSeed.siteSlug,
    existingHome: toProbe(existingHome.docs[0]),
    existingBySlugHome: toProbe(existingBySlugHome.docs[0]),
  });

  if (decision.action === 'abort') {
    return { status: 'aborted', reason: 'site_not_found' };
  }

  if (decision.action === 'skip') {
    return { status: 'skipped', reason: decision.reason };
  }

  const created = await payload.create({
    collection: 'pages',
    overrideAccess: true,
    data: {
      title: holdingHomeSeed.title,
      slug: holdingHomeSeed.slug,
      pageType: holdingHomeSeed.pageType,
      site: homeSiteDoc!.id,
      layout: holdingHomeSeed.layout,
      seo: holdingHomeSeed.seo,
      _status: 'published',
    },
  });

  return { status: 'created', pageId: created.id };
}

/** Log sanitizado — sem documentos, secrets ou connection strings. */
export const formatHoldingHomeSeedLog = (outcome: HoldingHomeSeedOutcome): string => {
  switch (outcome.status) {
    case 'created':
      return 'holding-home: created';
    case 'skipped':
      return `holding-home: skipped: ${outcome.reason}`;
    case 'aborted':
      return `holding-home: aborted: ${outcome.reason}`;
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
};
