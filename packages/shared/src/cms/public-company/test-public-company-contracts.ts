/* eslint-disable no-console -- test harness */
import assert from 'node:assert/strict';

import {
  mapPublicCompanyDetail,
  mapPublicCompanyListItem,
  sortPublicCompaniesByDisplayOrder,
} from './map';

const base = {
  id: 1,
  name: 'Renovação Refrigeração',
  slug: 'renovacao-refrigeracao',
  portalSlug: 'renovacao',
  shortDescription: 'Engenharia e execução técnica.',
  positioning: 'Braço de engenharia da Holding.',
  ecosystemRole: 'Engenharia',
  brandTheme: 'renovacao',
  displayOrder: 1,
  status: 'active',
  _status: 'published',
  showInEcosystem: true,
  externalSite: 'https://renovacaorefrigeracao.com.br',
  offerings: [{ title: 'Retrofit', kind: 'service' }],
  authorityStats: [{ value: '+30', label: 'anos' }],
  seo: {
    metaTitle: 'Renovação',
    metaDescription: 'Engenharia',
    schemaType: 'Organization',
  },
};

assert.equal(mapPublicCompanyListItem(base)?.portalSlug, 'renovacao');
assert.equal(mapPublicCompanyListItem({ ...base, showInEcosystem: false }), null);
assert.equal(mapPublicCompanyDetail(base)?.offerings[0]?.title, 'Retrofit');
assert.deepEqual(
  sortPublicCompaniesByDisplayOrder([
    { displayOrder: 2, portalSlug: 'b' },
    { displayOrder: 1, portalSlug: 'a' },
  ]).map((item) => item.portalSlug),
  ['a', 'b'],
);

console.log('1 teste de contrato public-company passou.');
