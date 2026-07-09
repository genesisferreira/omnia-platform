/* eslint-disable no-console */
import { getPayload } from 'payload';

import config from '../../payload.config';
import { defaultTenantSeed, holdingCompaniesSeed } from './holding-companies';

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

  const existingGlobals = await payload
    .findGlobal({ slug: 'global-settings' })
    .catch(() => null);

  if (existingGlobals?.siteName) {
    console.log('✓ Global Settings já existe — seed ignorado');
  } else {
    await payload.updateGlobal({
      slug: 'global-settings',
      data: {
        siteName: 'Omnia Platform',
        tagline: 'Ecossistema digital da Omnia Frigo Holding',
        heroTitle: 'Ecossistema Omnia Frigo Holding',
        heroSubtitle:
          'Uma plataforma unificada para gestão, educação, serviços e inovação no setor de refrigeração.',
        ctaLabel: 'Conheça o ecossistema',
        ctaUrl: '#ecossistema',
      },
    });
    console.log('✓ Global Settings criado');
  }

  console.log('✅ Seed concluído.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
