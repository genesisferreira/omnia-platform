/**
 * Atualiza (ou cria) conteúdo estratégico das empresas do hub.
 * Idempotente: localiza por slug interno; preenche portalSlug e conteúdo editorial.
 */

import {
  holdingPortalCompanyDefaults,
  strategicCompaniesSeed,
  type StrategicCompanySeed,
} from './holding-strategic-companies';

export type StrategicCompanyOutcome =
  | { slug: string; portalSlug: string; status: 'created'; id: string | number }
  | { slug: string; portalSlug: string; status: 'upgraded'; id: string | number }
  | { slug: string; portalSlug: string; status: 'aborted'; reason: string };

export type HoldingStrategicCompaniesOutcome = {
  items: StrategicCompanyOutcome[];
};

type FindResult = { docs: Array<{ id: string | number; slug?: unknown }> };

export type StrategicCompaniesPayload = {
  find: (args: {
    collection: 'companies';
    where?: unknown;
    limit?: number;
    depth?: number;
    overrideAccess?: boolean;
  }) => Promise<FindResult>;
  create: (args: {
    collection: 'companies';
    overrideAccess?: boolean;
    data: Record<string, unknown>;
  }) => Promise<{ id: string | number }>;
  update: (args: {
    collection: 'companies';
    id: string | number;
    overrideAccess?: boolean;
    data: Record<string, unknown>;
  }) => Promise<{ id: string | number }>;
};

export const adaptPayloadForStrategicCompanies = (payload: {
  find: unknown;
  create: unknown;
  update: unknown;
}): StrategicCompaniesPayload => ({
  find: (args) => (payload.find as StrategicCompaniesPayload['find'])(args),
  create: (args) => (payload.create as StrategicCompaniesPayload['create'])(args),
  update: (args) => (payload.update as StrategicCompaniesPayload['update'])(args),
});

const toStrategicData = (seed: StrategicCompanySeed): Record<string, unknown> => ({
  name: seed.name,
  slug: seed.slug,
  portalSlug: seed.portalSlug,
  shortDescription: seed.shortDescription,
  positioning: seed.positioning,
  institutionalText: seed.institutionalText,
  mission: seed.mission,
  vision: seed.vision,
  values: seed.values,
  differentiators: seed.differentiators,
  authorityStats: seed.authorityStats,
  offerings: seed.offerings,
  audiences: seed.audiences,
  ecosystemRole: seed.ecosystemRole,
  brandTheme: seed.brandTheme,
  displayOrder: seed.displayOrder,
  externalSite: seed.externalSite,
  status: 'active',
  isHolding: false,
  showInEcosystem: true,
  primaryCta: seed.primaryCta,
  secondaryCta: seed.secondaryCta,
  seo: {
    ...seed.seo,
    canonicalUrl: null,
    noIndex: false,
    noFollow: false,
  },
  timezone: 'America/Sao_Paulo',
  publishedAt: new Date().toISOString(),
});

export async function runHoldingStrategicCompaniesSeed(
  payload: StrategicCompaniesPayload,
): Promise<HoldingStrategicCompaniesOutcome> {
  const items: StrategicCompanyOutcome[] = [];

  // Holding defaults (não aparece nos cards).
  {
    const existing = await payload.find({
      collection: 'companies',
      where: { slug: { equals: holdingPortalCompanyDefaults.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = existing.docs[0];
    if (doc) {
      await payload.update({
        collection: 'companies',
        id: doc.id,
        overrideAccess: true,
        data: {
          portalSlug: holdingPortalCompanyDefaults.portalSlug,
          isHolding: true,
          showInEcosystem: false,
          brandTheme: holdingPortalCompanyDefaults.brandTheme,
          positioning: holdingPortalCompanyDefaults.positioning,
          ecosystemRole: holdingPortalCompanyDefaults.ecosystemRole,
        },
      });
      items.push({
        slug: holdingPortalCompanyDefaults.slug,
        portalSlug: holdingPortalCompanyDefaults.portalSlug,
        status: 'upgraded',
        id: doc.id,
      });
    }
  }

  // Sapientia permanece cadastrada, mas fora do ecossistema hub.
  {
    const existing = await payload.find({
      collection: 'companies',
      where: { slug: { equals: 'centro-educacional-sapientia' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = existing.docs[0];
    if (doc) {
      await payload.update({
        collection: 'companies',
        id: doc.id,
        overrideAccess: true,
        data: {
          portalSlug: 'sapientia',
          showInEcosystem: false,
          brandTheme: 'omnia',
        },
      });
      items.push({
        slug: 'centro-educacional-sapientia',
        portalSlug: 'sapientia',
        status: 'upgraded',
        id: doc.id,
      });
    }
  }

  for (const seed of strategicCompaniesSeed) {
    const existing = await payload.find({
      collection: 'companies',
      where: { slug: { equals: seed.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = existing.docs[0];
    const data = toStrategicData(seed);

    if (doc) {
      await payload.update({
        collection: 'companies',
        id: doc.id,
        overrideAccess: true,
        data,
      });
      items.push({
        slug: seed.slug,
        portalSlug: seed.portalSlug,
        status: 'upgraded',
        id: doc.id,
      });
      continue;
    }

    const created = await payload.create({
      collection: 'companies',
      overrideAccess: true,
      data,
    });
    items.push({
      slug: seed.slug,
      portalSlug: seed.portalSlug,
      status: 'created',
      id: created.id,
    });
  }

  return { items };
}

export const formatHoldingStrategicCompaniesLog = (
  outcome: HoldingStrategicCompaniesOutcome,
): string => {
  const parts = outcome.items.map((item) => {
    if (item.status === 'aborted') {
      return `${item.portalSlug}:aborted:${item.reason}`;
    }
    return `${item.portalSlug}:${item.status}`;
  });
  return `holding-strategic-companies: ${parts.join(',')}`;
};
