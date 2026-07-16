/* eslint-disable no-console */
import { getPayload } from 'payload';

import config from '../../payload.config';
import { defaultTenantSeed, holdingCompaniesSeed } from './holding-companies';
import { decideHoldingHomeSeed, holdingHomeSeed } from './holding-home';
import { sitesSeed } from './sites';

async function seed() {
  const payload = await getPayload({ config });

  console.log('🌱 Iniciando seed Sprint 2...');

  const existingTenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: defaultTenantSeed.slug } },
    limit: 1,
  });

  let tenantId: number | string;

  if (existingTenants.docs.length > 0) {
    tenantId = existingTenants.docs[0]!.id;
    console.log('✓ Tenant já existe:', defaultTenantSeed.slug);
  } else {
    const tenant = await payload.create({
      collection: 'tenants',
      data: defaultTenantSeed,
    });
    tenantId = tenant.id;
    console.log('✓ Tenant criado:', defaultTenantSeed.slug);
  }

  for (const company of holdingCompaniesSeed) {
    const existing = await payload.find({
      collection: 'companies',
      where: { slug: { equals: company.slug } },
      limit: 1,
    });

    if (existing.docs.length > 0) {
      console.log(`  · Empresa já existe: ${company.slug}`);
      continue;
    }

    await payload.create({
      collection: 'companies',
      data: {
        ...company,
        tenant: tenantId,
      },
    });
    console.log(`  ✓ Empresa criada: ${company.name}`);
  }

  console.log('🌱 Seed Sites...');

  const holdingTenant = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: 'omnia-holding' } },
    limit: 1,
  });

  const holdingTenantDoc = holdingTenant.docs[0];

  if (!holdingTenantDoc) {
    throw new Error(
      'Seed Sites abortado: tenant "omnia-holding" não encontrado. Execute o seed de tenants/companies antes.',
    );
  }

  const sitesTenantId = holdingTenantDoc.id;

  const companiesResult = await payload.find({
    collection: 'companies',
    limit: 100,
    depth: 0,
  });

  const companiesBySlug = new Map<string, number | string>();

  for (const company of companiesResult.docs) {
    companiesBySlug.set(company.slug, company.id);
  }

  for (const site of sitesSeed) {
    const companyId = companiesBySlug.get(site.companySlug);

    if (companyId === undefined) {
      throw new Error(
        `Seed Sites abortado: company "${site.companySlug}" não encontrada para o site "${site.slug}".`,
      );
    }

    // Collection `sites` registrada; payload-types.ts ainda sem regenerate.
    const existingSites = await payload.find({
      collection: 'sites',
      where: { slug: { equals: site.slug } },
      limit: 1,
      depth: 0,
    } as unknown as Parameters<typeof payload.find>[0]);

    if (existingSites.docs.length > 0) {
      console.log(`  · Site já existe: ${site.slug}`);
      continue;
    }

    await payload.create({
      collection: 'sites',
      overrideAccess: true,
      data: {
        name: site.name,
        internalName: site.internalName,
        slug: site.slug,
        type: site.type,
        siteStatus: site.siteStatus,
        environment: site.environment,
        locale: site.locale,
        timezone: site.timezone,
        isExternal: site.isExternal,
        ...(site.externalUrl !== undefined ? { externalUrl: site.externalUrl } : {}),
        isPrimaryForCompany: site.isPrimaryForCompany,
        visibilityScope: site.visibilityScope,
        editorialStatus: site.editorialStatus,
        tenant: sitesTenantId,
        company: companyId,
        _status: 'published',
      },
    } as unknown as Parameters<typeof payload.create>[0]);

    console.log(`  ✓ Site criado: ${site.slug}`);
  }

  const existingGlobals = await payload.findGlobal({ slug: 'global-settings' }).catch(() => null);

  if (existingGlobals?.siteName) {
    console.log('✓ Global Settings já existe — seed ignorado');
  } else {
    await payload.updateGlobal({
      slug: 'global-settings',
      data: {
        siteName: 'Omnia Platform',
        tagline: 'Ecossistema digital da Omnia Frigo Holding',
        heroTitle: 'Ecossistema Omnia Frigo Holding',
        heroSubtitle: 'Tradição, Educação e Inteligência Artificial em Refrigeração.',
        ctaLabel: 'Conheça o ecossistema',
        ctaUrl: '#ecossistema',
      },
    });
    console.log('✓ Global Settings criado');
  }

  console.log('🌱 Seed Home (omnia-hub)...');

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
    : { docs: [] as { id: string | number; slug: string; pageType: string }[] };

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
    : { docs: [] as { id: string | number; slug: string; pageType: string }[] };

  const homeDoc = existingHome.docs[0];
  const slugDoc = existingBySlugHome.docs[0];

  const decision = decideHoldingHomeSeed({
    siteFound: Boolean(homeSiteDoc),
    siteSlug: holdingHomeSeed.siteSlug,
    existingHome: homeDoc
      ? { id: homeDoc.id, slug: String(homeDoc.slug), pageType: String(homeDoc.pageType) }
      : null,
    existingBySlugHome: slugDoc
      ? { id: slugDoc.id, slug: String(slugDoc.slug), pageType: String(slugDoc.pageType) }
      : null,
  });

  if (decision.action === 'abort') {
    throw new Error(`Seed Home abortado: ${decision.detail}`);
  }

  if (decision.action === 'skip') {
    console.log(`✓ Home seed ignorado (${decision.reason}): ${decision.detail}`);
  } else {
    await payload.create({
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
    console.log('✓ Home criada para omnia-hub');
  }

  console.log('✅ Seed concluído.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
