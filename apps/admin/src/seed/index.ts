/* eslint-disable no-console */
import { getPayload } from 'payload';

import config from '../../payload.config';
import { defaultTenantSeed, holdingCompaniesSeed } from './holding-companies';
import { holdingHomeSeed } from './holding-home';
import { adaptPayloadForHoldingHomeSeed, runHoldingHomeSeed } from './run-holding-home';
import {
  adaptPayloadForInstitutionalPagesSeed,
  hasInstitutionalPagesSeedAbort,
  runHoldingInstitutionalPagesSeed,
} from './run-holding-institutional-pages';
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
      const doc = existing.docs[0]!;
      await payload.update({
        collection: 'companies',
        id: doc.id,
        overrideAccess: true,
        data: {
          name: company.name,
          portalSlug: company.portalSlug,
          ecosystemRole: company.ecosystemRole,
          externalSite: company.externalSite,
          shortDescription: company.shortDescription,
          displayOrder: company.displayOrder,
          status: company.status,
          isHolding: company.isHolding ?? false,
          showInEcosystem: company.showInEcosystem ?? true,
          brandTheme: company.brandTheme ?? 'omnia',
        },
      });
      console.log(`  ✓ Empresa sincronizada: ${company.slug}`);
      continue;
    }

    // Payload tipa create com overloads de draft; seed canônico publica diretamente.
    await payload.create({
      collection: 'companies',
      overrideAccess: true,
      data: {
        name: company.name,
        slug: company.slug,
        portalSlug: company.portalSlug,
        shortDescription: company.shortDescription,
        ecosystemRole: company.ecosystemRole,
        displayOrder: company.displayOrder,
        externalSite: company.externalSite,
        status: company.status,
        tenant: tenantId,
        isHolding: company.isHolding ?? false,
        showInEcosystem: company.showInEcosystem ?? true,
        brandTheme: company.brandTheme ?? 'omnia',
      },
    } as never);
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

  const homeOutcome = await runHoldingHomeSeed(adaptPayloadForHoldingHomeSeed(payload));

  if (homeOutcome.status === 'aborted') {
    throw new Error(
      `Seed Home abortado: Site "${holdingHomeSeed.siteSlug}" não encontrado. Execute o seed de sites antes.`,
    );
  }

  if (homeOutcome.status === 'skipped') {
    console.log(`✓ Home seed ignorado (${homeOutcome.reason})`);
  } else {
    console.log('✓ Home criada para omnia-hub');
  }

  console.log('🌱 Seed páginas institucionais (omnia-hub)...');

  const institutionalOutcome = await runHoldingInstitutionalPagesSeed(
    adaptPayloadForInstitutionalPagesSeed(payload),
  );

  if (hasInstitutionalPagesSeedAbort(institutionalOutcome)) {
    throw new Error(
      'Seed páginas institucionais abortado: Site "omnia-hub" não encontrado. Execute o seed de sites antes.',
    );
  }

  for (const item of institutionalOutcome.items) {
    if (item.status === 'created') {
      console.log(`  ✓ Página criada: ${item.slug}`);
    } else {
      console.log(`  · Página já existe: ${item.slug}`);
    }
  }

  console.log('✅ Seed concluído.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
