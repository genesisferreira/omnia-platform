/* eslint-disable no-console -- test harness */
import assert from 'node:assert/strict';

import { buildBreadcrumbJsonLd, buildCompanyOrganizationJsonLd } from '../lib/seo/json-ld';

const org = buildCompanyOrganizationJsonLd({
  pathname: '/empresas/renovacao',
  name: 'Renovação Refrigeração',
  description: 'Engenharia',
  hostname: 'dev.omniafrigo.com.br',
});

assert.equal(org['@type'], 'Organization');
assert.equal(org.name, 'Renovação Refrigeração');

const crumbs = buildBreadcrumbJsonLd({
  hostname: 'dev.omniafrigo.com.br',
  items: [
    { name: 'Início', pathname: '/' },
    { name: 'Empresas', pathname: '/empresas' },
    { name: 'Renovação', pathname: '/empresas/renovacao' },
  ],
});

assert.equal(crumbs['@type'], 'BreadcrumbList');
assert.equal(Array.isArray(crumbs.itemListElement), true);
assert.equal((crumbs.itemListElement as unknown[]).length, 3);

console.log('1 teste SEO empresas passou.');
