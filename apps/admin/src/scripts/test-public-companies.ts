/* eslint-disable no-console -- test harness output */
import assert from 'node:assert/strict';

import type { PublicCompanyListItemDto } from '@omnia/shared';

import {
  mapPublicCompany,
  mapPublicCompanyLogo,
  normalizeDisplayOrder,
  sanitizeExternalSite,
  sanitizeLogoAlt,
  sanitizeLogoUrl,
  sortPublicCompaniesByDisplayOrder,
} from '../endpoints/public-companies';

const baseActive = {
  id: 7,
  name: 'Neurofrigo Command IA',
  slug: 'neurofrigo',
  portalSlug: 'neurofrigo',
  shortDescription: 'Tecnologia e IA em refrigeração.',
  ecosystemRole: 'Tecnologia',
  displayOrder: 2,
  status: 'active',
  showInEcosystem: true,
  brandTheme: 'neurofrigo',
  externalSite: 'https://neurofrigo.com.br',
  tenant: { id: 1, slug: 'omnia-holding', name: 'Holding' },
  fullDescription: { root: { children: [] } },
  logo: {
    id: 99,
    url: '/media/neurofrigo-logo.png',
    alt: 'Logo Neurofrigo',
    filename: 'neurofrigo-logo.png',
    mimeType: 'image/png',
    filesize: 12345,
  },
};

let passed = 0;

const test = (name: string, fn: () => void): void => {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

test('documento ativo válido é mapeado', () => {
  const dto = mapPublicCompany(baseActive);
  assert.ok(dto);
  assert.equal(dto.id, '7');
  assert.equal(dto.name, baseActive.name);
  assert.equal(dto.slug, baseActive.slug);
  assert.equal(dto.portalSlug, 'neurofrigo');
  assert.equal(dto.shortDescription, baseActive.shortDescription);
  assert.equal(dto.ecosystemRole, baseActive.ecosystemRole);
  assert.equal(dto.displayOrder, 2);
  assert.equal(dto.externalSite, 'https://neurofrigo.com.br');
});

test('Holding é excluída', () => {
  assert.equal(mapPublicCompany({ ...baseActive, slug: 'omnia-frigo-holding' }), null);
  assert.equal(mapPublicCompany({ ...baseActive, isHolding: true }), null);
});

test('empresa inativa é excluída', () => {
  assert.equal(mapPublicCompany({ ...baseActive, status: 'inactive' }), null);
});

test('empresa fora do ecossistema é excluída da listagem', () => {
  assert.equal(mapPublicCompany({ ...baseActive, showInEcosystem: false }), null);
});

test('campos internos não aparecem no DTO', () => {
  const dto = mapPublicCompany(baseActive);
  assert.ok(dto);
  const keys = Object.keys(dto).sort();
  assert.deepEqual(keys, [
    'brandTheme',
    'coverImage',
    'displayOrder',
    'ecosystemRole',
    'externalSite',
    'id',
    'logo',
    'name',
    'portalSlug',
    'positioning',
    'primaryCta',
    'shortDescription',
    'slug',
  ]);
  assert.equal('tenant' in dto, false);
  assert.equal('fullDescription' in dto, false);
  assert.equal('status' in dto, false);
});

test('id numérico vira string', () => {
  const dto = mapPublicCompany({ ...baseActive, id: 42 });
  assert.ok(dto);
  assert.equal(dto.id, '42');
});

test('externalSite https válido permanece', () => {
  assert.equal(sanitizeExternalSite('https://example.com/path'), 'https://example.com/path');
});

test('protocolo javascript:, data: ou URL inválida vira null', () => {
  assert.equal(sanitizeExternalSite('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalSite('data:text/html,hi'), null);
  const dto = mapPublicCompany({ ...baseActive, externalSite: 'javascript:alert(1)' });
  assert.ok(dto);
  assert.equal(dto.externalSite, null);
});

test('logo retorna somente url e alt', () => {
  const dto = mapPublicCompany(baseActive);
  assert.ok(dto);
  assert.deepEqual(dto.logo, {
    url: '/media/neurofrigo-logo.png',
    alt: 'Logo Neurofrigo',
  });
});

test('documento obrigatório incompleto é excluído', () => {
  assert.equal(mapPublicCompany({ ...baseActive, name: '' }), null);
  assert.equal(mapPublicCompany({ ...baseActive, slug: '' }), null);
  assert.equal(mapPublicCompany({ ...baseActive, shortDescription: '  ' }), null);
  assert.equal(mapPublicCompany({ ...baseActive, ecosystemRole: null }), null);
});

test('ordenação por displayOrder é determinística', () => {
  const unordered: PublicCompanyListItemDto[] = [
    {
      id: '1',
      name: 'B',
      slug: 'b-company',
      portalSlug: 'b-company',
      shortDescription: 'b',
      positioning: null,
      ecosystemRole: 'x',
      brandTheme: 'omnia',
      displayOrder: 5,
      externalSite: null,
      logo: null,
      coverImage: null,
      primaryCta: null,
    },
    {
      id: '2',
      name: 'A',
      slug: 'a-company',
      portalSlug: 'a-company',
      shortDescription: 'a',
      positioning: null,
      ecosystemRole: 'x',
      brandTheme: 'omnia',
      displayOrder: 1,
      externalSite: null,
      logo: null,
      coverImage: null,
      primaryCta: null,
    },
    {
      id: '3',
      name: 'C',
      slug: 'c-company',
      portalSlug: 'c-company',
      shortDescription: 'c',
      positioning: null,
      ecosystemRole: 'x',
      brandTheme: 'omnia',
      displayOrder: 5,
      externalSite: null,
      logo: null,
      coverImage: null,
      primaryCta: null,
    },
  ];

  const sorted = sortPublicCompaniesByDisplayOrder(unordered);
  assert.deepEqual(
    sorted.map((c) => c.portalSlug),
    ['a-company', 'b-company', 'c-company'],
  );
});

test('logo relativa /media/logo.png aceita', () => {
  assert.equal(sanitizeLogoUrl('/media/logo.png'), '/media/logo.png');
  assert.deepEqual(mapPublicCompanyLogo({ url: '/media/logo.png', alt: 'x' }), {
    url: '/media/logo.png',
    alt: 'x',
  });
});

test('logo absoluta https aceita', () => {
  assert.equal(
    sanitizeLogoUrl('https://cdn.example.com/logo.png'),
    'https://cdn.example.com/logo.png',
  );
});

test('logo //evil.example/logo.png rejeitada', () => {
  assert.equal(sanitizeLogoUrl('//evil.example/logo.png'), null);
});

test('logo javascript: rejeitada', () => {
  assert.equal(sanitizeLogoUrl('javascript:alert(1)'), null);
});

test('logo data: rejeitada', () => {
  assert.equal(sanitizeLogoUrl('data:image/png;base64,abc'), null);
});

test('logo file: rejeitada', () => {
  assert.equal(sanitizeLogoUrl('file:///etc/passwd'), null);
});

test('logo ftp: rejeitada', () => {
  assert.equal(sanitizeLogoUrl('ftp://files.example.com/logo.png'), null);
});

test('logo relativa sem / rejeitada', () => {
  assert.equal(sanitizeLogoUrl('media/logo.png'), null);
});

test('logo com barras invertidas rejeitada', () => {
  assert.equal(sanitizeLogoUrl('/media\\logo.png'), null);
});

test('logo absoluta com username/password rejeitada', () => {
  assert.equal(sanitizeLogoUrl('https://user:pass@cdn.example.com/logo.png'), null);
});

test('alt vazio → null', () => {
  assert.equal(sanitizeLogoAlt(''), null);
});

test('alt whitespace → null', () => {
  assert.equal(sanitizeLogoAlt('   '), null);
});

test('alt válido é trimmed', () => {
  assert.equal(sanitizeLogoAlt('  Logo Omnia  '), 'Logo Omnia');
});

test('displayOrder NaN usa fallback seguro', () => {
  assert.equal(normalizeDisplayOrder(Number.NaN), 0);
});

test('displayOrder Infinity usa fallback seguro', () => {
  assert.equal(normalizeDisplayOrder(Number.POSITIVE_INFINITY), 0);
});

test('displayOrder não numérico usa fallback seguro', () => {
  assert.equal(normalizeDisplayOrder('3'), 0);
});

test('id "" é rejeitado', () => {
  assert.equal(mapPublicCompany({ ...baseActive, id: '' }), null);
});

test('externalSite file: explicitamente rejeitado', () => {
  assert.equal(sanitizeExternalSite('file:///tmp/x'), null);
});

console.log(`\n${passed} testes passaram.`);
