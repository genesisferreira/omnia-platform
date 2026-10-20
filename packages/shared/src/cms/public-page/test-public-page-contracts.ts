/* eslint-disable no-console -- test harness output */
import assert from 'node:assert/strict';

import {
  COMPANIES_BLOCK_MAX_LIMIT,
  FEATURES_BLOCK_MAX_ITEMS,
  INSTITUTIONAL_INTRO_MAX_HIGHLIGHTS,
  VALUES_BLOCK_MAX_ITEMS,
  mapPublicPage,
  mapPublicPageBlock,
  sanitizePublicHref,
} from './index';

let passed = 0;

const test = (name: string, fn: () => void): void => {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

const basePage = {
  id: '1',
  site: { id: '10', slug: 'omnia-hub' },
  title: 'Home Omnia',
  slug: 'home',
  pageType: 'home',
  blocks: [] as unknown[],
  seo: {
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    noIndex: false,
  },
};

test('Hero válido', () => {
  const dto = mapPublicPageBlock({
    blockType: 'hero',
    title: 'Ecossistema Omnia Frigo Holding',
    subtitle: 'Tradição, Educação e Inteligência Artificial em Refrigeração.',
    variant: 'default',
  });
  assert.ok(dto);
  assert.equal(dto.blockType, 'hero');
  if (dto.blockType === 'hero') {
    assert.equal(dto.title, 'Ecossistema Omnia Frigo Holding');
    assert.equal(dto.primaryAction, null);
  }
});

test('Hero sem título rejeitado', () => {
  assert.equal(mapPublicPageBlock({ blockType: 'hero', title: '   ' }), null);
  assert.equal(mapPublicPageBlock({ blockType: 'hero' }), null);
});

test('Hero com ações opcionais válidas', () => {
  const dto = mapPublicPageBlock({
    blockType: 'hero',
    title: 'Título',
    primaryAction: { label: 'Conheça', href: '#ecossistema' },
    secondaryAction: { label: 'Site', href: 'https://omniafrigo.com.br/' },
  });
  assert.ok(dto);
  if (dto.blockType === 'hero') {
    assert.deepEqual(dto.primaryAction, { label: 'Conheça', href: '#ecossistema' });
    assert.ok(dto.secondaryAction);
  }
});

test('URLs internas e HTTPS aceitas', () => {
  assert.equal(sanitizePublicHref('/empresas'), '/empresas');
  assert.equal(sanitizePublicHref('#empresas'), '#empresas');
  assert.equal(sanitizePublicHref('https://example.com/a'), 'https://example.com/a');
  assert.equal(sanitizePublicHref('http://example.com/a'), 'http://example.com/a');
});

test('protocolos proibidos e URLs inseguras rejeitados', () => {
  assert.equal(sanitizePublicHref('javascript:alert(1)'), null);
  assert.equal(sanitizePublicHref('data:text/html,x'), null);
  assert.equal(sanitizePublicHref('file:///etc/passwd'), null);
  assert.equal(sanitizePublicHref('ftp://files.example'), null);
  assert.equal(sanitizePublicHref('//evil.example/x'), null);
  assert.equal(sanitizePublicHref('https://user:pass@example.com/'), null);
  assert.equal(sanitizePublicHref('/path\\escape'), null);
});

test('Features válido', () => {
  const dto = mapPublicPageBlock({
    blockType: 'features',
    title: 'Ecossistema',
    items: [
      { title: 'A', description: 'Desc A', iconKey: 'cms' },
      { title: 'B', description: 'Desc B' },
    ],
    columns: 2,
  });
  assert.ok(dto);
  if (dto.blockType === 'features') {
    assert.equal(dto.items.length, 2);
    assert.equal(dto.columns, 2);
  }
});

test('Features item incompleto rejeitado', () => {
  assert.equal(
    mapPublicPageBlock({
      blockType: 'features',
      items: [{ title: 'A', description: '' }],
    }),
    null,
  );
});

test('Features com itens acima do máximo rejeitado', () => {
  const items = Array.from({ length: FEATURES_BLOCK_MAX_ITEMS + 1 }, (_, i) => ({
    title: `T${i}`,
    description: `D${i}`,
  }));
  assert.equal(mapPublicPageBlock({ blockType: 'features', items }), null);
});

test('Features iconKey desconhecido rejeitado', () => {
  assert.equal(
    mapPublicPageBlock({
      blockType: 'features',
      items: [{ title: 'A', description: 'B', iconKey: 'svg-raw' }],
    }),
    null,
  );
});

test('institutionalIntro válido', () => {
  const dto = mapPublicPageBlock({
    blockType: 'institutionalIntro',
    eyebrow: 'Omnia Frigo Holding',
    title: 'Hub integrador',
    body: 'Corpo institucional canônico.',
    highlights: [{ text: 'Tradição' }, { text: 'Educação' }],
  });
  assert.ok(dto);
  if (dto.blockType === 'institutionalIntro') {
    assert.equal(dto.title, 'Hub integrador');
    assert.deepEqual(dto.highlights, ['Tradição', 'Educação']);
  }
});

test('institutionalIntro sem título ou corpo rejeitado', () => {
  assert.equal(
    mapPublicPageBlock({ blockType: 'institutionalIntro', title: 'T', body: '   ' }),
    null,
  );
  assert.equal(mapPublicPageBlock({ blockType: 'institutionalIntro', body: 'B' }), null);
});

test('institutionalIntro highlights acima do máximo rejeitado', () => {
  const highlights = Array.from({ length: INSTITUTIONAL_INTRO_MAX_HIGHLIGHTS + 1 }, (_, i) => ({
    text: `H${i}`,
  }));
  assert.equal(
    mapPublicPageBlock({
      blockType: 'institutionalIntro',
      title: 'T',
      body: 'B',
      highlights,
    }),
    null,
  );
});

test('missionVision válido', () => {
  const dto = mapPublicPageBlock({
    blockType: 'missionVision',
    missionTitle: 'Missão',
    missionBody: 'Transformar a refrigeração brasileira.',
    visionTitle: 'Visão 2035',
    visionBody: 'Ser referência na América Latina.',
    visionYear: '2035',
  });
  assert.ok(dto);
  if (dto.blockType === 'missionVision') {
    assert.equal(dto.visionYear, '2035');
  }
});

test('missionVision campos obrigatórios ausentes rejeitado', () => {
  assert.equal(
    mapPublicPageBlock({
      blockType: 'missionVision',
      missionTitle: 'Missão',
      missionBody: 'Corpo',
      visionTitle: 'Visão',
    }),
    null,
  );
});

test('values válido com iconKey allowlist', () => {
  const dto = mapPublicPageBlock({
    blockType: 'values',
    title: 'Nossos valores',
    items: [
      { title: 'Ética', description: 'Conduta transparente.', iconKey: 'ethics' },
      { title: 'Parceria', iconKey: 'partnership' },
    ],
  });
  assert.ok(dto);
  if (dto.blockType === 'values') {
    assert.equal(dto.items[0]?.iconKey, 'ethics');
  }
});

test('values iconKey desconhecido usa fallback null', () => {
  const dto = mapPublicPageBlock({
    blockType: 'values',
    items: [{ title: 'Ética', iconKey: 'unknown-svg' }],
  });
  assert.ok(dto);
  if (dto.blockType === 'values') {
    assert.equal(dto.items[0]?.iconKey, null);
  }
});

test('values itens fora do intervalo rejeitado', () => {
  const items = Array.from({ length: VALUES_BLOCK_MAX_ITEMS + 1 }, (_, i) => ({
    title: `V${i}`,
  }));
  assert.equal(mapPublicPageBlock({ blockType: 'values', items }), null);
  assert.equal(mapPublicPageBlock({ blockType: 'values', items: [] }), null);
});

test('bloco conhecido inválido rejeita o mapa da página', () => {
  assert.equal(
    mapPublicPage({
      ...basePage,
      blocks: [
        { blockType: 'hero', title: 'Home' },
        { blockType: 'values', items: [] },
      ],
    }),
    null,
  );
});

test('ordem dos seis blocos institucionais preservada', () => {
  const dto = mapPublicPage({
    ...basePage,
    blocks: [
      { blockType: 'hero', title: 'Home' },
      { blockType: 'institutionalIntro', title: 'Intro', body: 'Corpo' },
      {
        blockType: 'missionVision',
        missionTitle: 'M',
        missionBody: 'MB',
        visionTitle: 'V',
        visionBody: 'VB',
      },
      { blockType: 'values', items: [{ title: 'Ética' }] },
      {
        blockType: 'features',
        items: [{ title: 'A', description: 'B' }],
      },
      { blockType: 'companies' },
    ],
  });
  assert.ok(dto);
  assert.deepEqual(
    dto.blocks.map((b) => b.blockType),
    ['hero', 'institutionalIntro', 'missionVision', 'values', 'features', 'companies'],
  );
});

test('sanitização contra conteúdo perigoso em highlights', () => {
  const dto = mapPublicPageBlock({
    blockType: 'institutionalIntro',
    title: 'T',
    body: 'B',
    highlights: [{ text: '  javascript:alert(1)  ' }],
  });
  assert.ok(dto);
  if (dto.blockType === 'institutionalIntro') {
    assert.equal(dto.highlights[0], 'javascript:alert(1)');
  }
});

test('Companies válido', () => {
  const dto = mapPublicPageBlock({
    blockType: 'companies',
    title: 'Empresas',
    limit: 5,
    showRole: true,
    showDescription: false,
    layout: 'list',
  });
  assert.ok(dto);
  if (dto.blockType === 'companies') {
    assert.equal(dto.limit, 5);
    assert.equal(dto.showDescription, false);
    assert.equal(dto.layout, 'list');
  }
});

test('Companies limit acima do teto é normalizado (clamp)', () => {
  const dto = mapPublicPageBlock({
    blockType: 'companies',
    limit: COMPANIES_BLOCK_MAX_LIMIT + 50,
  });
  assert.ok(dto);
  if (dto.blockType === 'companies') {
    assert.equal(dto.limit, COMPANIES_BLOCK_MAX_LIMIT);
  }
});

test('page DTO válido', () => {
  const dto = mapPublicPage({
    ...basePage,
    blocks: [
      { blockType: 'hero', title: 'Home' },
      {
        blockType: 'features',
        items: [{ title: 'A', description: 'B' }],
      },
      { blockType: 'companies', limit: 6 },
    ],
  });
  assert.ok(dto);
  assert.equal(dto.blocks.length, 3);
  assert.equal(dto.site.slug, 'omnia-hub');
  assert.equal(dto.pageType, 'home');
});

test('blockType desconhecido é ignorado deterministicamente', () => {
  const dto = mapPublicPage({
    ...basePage,
    blocks: [
      { blockType: 'hero', title: 'Home' },
      { blockType: 'legacy-unknown', title: 'x' },
      { blockType: 'companies' },
    ],
  });
  assert.ok(dto);
  assert.equal(dto.blocks.length, 2);
  assert.equal(dto.blocks[0]?.blockType, 'hero');
  assert.equal(dto.blocks[1]?.blockType, 'companies');
});

test('campos administrativos não aparecem no DTO', () => {
  const dto = mapPublicPage({
    ...basePage,
    blocks: [{ blockType: 'hero', title: 'Home' }],
    createdBy: { id: 9, email: 'a@b.c' },
    updatedBy: { id: 9 },
    _status: 'draft',
    versions: [{ id: 1 }],
    tenant: { id: 1, slug: 'secret' },
    company: { id: 2, name: 'Full Company Doc' },
  });
  assert.ok(dto);
  const keys = Object.keys(dto).sort();
  assert.deepEqual(keys, ['blocks', 'id', 'pageType', 'seo', 'site', 'slug', 'title']);
  assert.equal('createdBy' in dto, false);
  assert.equal('tenant' in dto, false);
  assert.equal('_status' in dto, false);
});

test('nenhum documento Payload completo aparece (allowlist de site)', () => {
  const dto = mapPublicPage({
    ...basePage,
    site: {
      id: '10',
      slug: 'omnia-hub',
      internalName: 'should-not-leak',
      tenant: { id: 1 },
      domains: [{ hostname: 'x' }],
    },
    blocks: [],
  });
  assert.ok(dto);
  assert.deepEqual(Object.keys(dto.site).sort(), ['id', 'slug']);
});

test('ordem dos blocos preservada', () => {
  const dto = mapPublicPage({
    ...basePage,
    blocks: [
      { blockType: 'companies' },
      { blockType: 'hero', title: 'H' },
      {
        blockType: 'features',
        items: [{ title: 'A', description: 'B' }],
      },
    ],
  });
  assert.ok(dto);
  assert.deepEqual(
    dto.blocks.map((b) => b.blockType),
    ['companies', 'hero', 'features'],
  );
});

test('resultado totalmente serializável em JSON', () => {
  const dto = mapPublicPage({
    ...basePage,
    blocks: [
      {
        blockType: 'hero',
        title: 'Home',
        primaryAction: { label: 'Ir', href: '/#empresas' },
      },
    ],
    seo: {
      metaTitle: 'Meta',
      metaDescription: 'Desc',
      canonicalUrl: 'https://dev.omniafrigo.com.br/',
      noIndex: false,
    },
  });
  assert.ok(dto);
  const json = JSON.stringify(dto);
  assert.equal(JSON.parse(json).title, 'Home Omnia');
  assert.ok(!json.includes('createdBy'));
});

test('Hero com primaryAction inválida rejeita o bloco', () => {
  assert.equal(
    mapPublicPageBlock({
      blockType: 'hero',
      title: 'Home',
      primaryAction: { label: 'X', href: 'javascript:void(0)' },
    }),
    null,
  );
});

console.log(`\n${passed} testes passaram.`);
