/* eslint-disable no-console -- test harness output */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  mapPublicPage,
  mapPublicPageBlock,
  PUBLIC_PAGE_MAX_BLOCKS,
  sanitizePublicCanonicalUrl,
  sanitizePublicHref,
  type PublicPageDto,
} from '@omnia/shared';

import {
  hasHomePerSiteConflict,
  hasSiteSlugConflict,
  normalizePageSlug,
  type PageUniquenessRecord,
} from '../collections/pages-rules';
import { buildPublishedPageWhere, mapPageDocumentToPublicDto } from '../endpoints/public-page';
import {
  PUBLIC_PAGE_CACHE_CONTROL,
  PUBLIC_PAGE_PARAM_MAX_LENGTH,
  validatePublicPageQuery,
} from '../endpoints/public-page-query';
import { decideHoldingHomeSeed, holdingHomeSeed } from '../seed/holding-home';
import { holdingHomeInstitutionalBlocks } from '../seed/holding-home-institutional';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../migrations');

let passed = 0;

const test = (name: string, fn: () => void): void => {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

const publishedDoc = {
  id: 11,
  title: 'Home Omnia Hub',
  slug: 'home',
  pageType: 'home',
  _status: 'published',
  site: { id: 3, slug: 'omnia-hub' },
  layout: [
    {
      blockType: 'hero',
      title: 'Ecossistema Omnia Frigo Holding',
      subtitle: 'Tradição, Educação e Inteligência Artificial em Refrigeração.',
      primaryAction: { label: 'Conheça o ecossistema', href: '#ecossistema' },
      variant: 'default',
    },
    ...holdingHomeInstitutionalBlocks,
    {
      blockType: 'features',
      title: 'Um ecossistema integrado',
      columns: '3',
      items: [
        {
          title: 'Multiempresa',
          description: 'Estrutura de tenants e empresas preparada para escalar.',
          iconKey: 'multiempresa',
        },
        {
          title: 'CMS centralizado',
          description: 'Conteúdo gerenciado via Payload CMS no painel admin.',
          iconKey: 'cms',
        },
        {
          title: 'Design unificado',
          description: 'Identidade visual Omnia aplicada em portal e admin.',
          iconKey: 'design',
        },
      ],
    },
    {
      blockType: 'companies',
      title: 'Empresas do ecossistema',
      subtitle: 'Conheça as marcas que compõem a Omnia Frigo Holding.',
      limit: 6,
      showRole: true,
      showDescription: true,
      layout: 'grid',
    },
  ],
  seo: {
    metaTitle: 'Omnia Frigo Holding',
    metaDescription: 'Tradição, Educação e Inteligência Artificial em Refrigeração.',
    canonicalUrl: null,
    noIndex: false,
  },
  tenant: { id: 1, slug: 'omnia-holding' },
  company: { id: 2 },
  updatedAt: '2026-07-15T00:00:00.000Z',
  createdAt: '2026-07-15T00:00:00.000Z',
};

test('página válida é mapeada para PublicPageDto', () => {
  const dto = mapPageDocumentToPublicDto(publishedDoc);
  assert.ok(dto);
  assert.equal(dto.id, '11');
  assert.equal(dto.title, 'Home Omnia Hub');
  assert.equal(dto.pageType, 'home');
  assert.equal(dto.blocks.length, 6);
});

test('DTO inclui site e slug do site', () => {
  const dto = mapPageDocumentToPublicDto(publishedDoc);
  assert.ok(dto);
  assert.deepEqual(dto.site, { id: '3', slug: 'omnia-hub' });
  assert.equal(dto.slug, 'home');
});

test('where do endpoint exige apenas published', () => {
  const where = buildPublishedPageWhere(3, 'home');
  assert.ok(where.and);
  assert.ok(Array.isArray(where.and));
  const statusClause = where.and.find(
    (clause) =>
      typeof clause === 'object' &&
      clause !== null &&
      '_status' in clause &&
      typeof (clause as { _status?: { equals?: string } })._status === 'object',
  ) as { _status: { equals: string } } | undefined;
  assert.ok(statusClause);
  assert.equal(statusClause._status.equals, 'published');
});

test('draft no documento de origem não aparece no DTO (campos admin omitidos)', () => {
  const dto = mapPageDocumentToPublicDto({ ...publishedDoc, _status: 'draft' });
  assert.ok(dto);
  assert.equal('_status' in dto, false);
  assert.equal('layout' in dto, false);
});

test('página sem site populado não mapeia (404 path)', () => {
  assert.equal(mapPageDocumentToPublicDto({ ...publishedDoc, site: 3 }), null);
  assert.equal(mapPageDocumentToPublicDto({ ...publishedDoc, site: null }), null);
});

test('parâmetros válidos site+slug', () => {
  const result = validatePublicPageQuery(new URLSearchParams('site=omnia-hub&slug=home'));
  assert.deepEqual(result, { ok: true, site: 'omnia-hub', slug: 'home' });
});

test('parâmetros inválidos: extras, vazios, depth, sort', () => {
  assert.equal(validatePublicPageQuery(new URLSearchParams('site=omnia-hub')).ok, false);
  assert.equal(validatePublicPageQuery(new URLSearchParams('slug=home')).ok, false);
  assert.equal(
    validatePublicPageQuery(new URLSearchParams('site=omnia-hub&slug=home&depth=2')).ok,
    false,
  );
  assert.equal(
    validatePublicPageQuery(new URLSearchParams('site=omnia-hub&slug=home&limit=10')).ok,
    false,
  );
  assert.equal(validatePublicPageQuery(new URLSearchParams('site=&slug=home')).ok, false);
});

test('parâmetros duplicados são rejeitados', () => {
  const result = validatePublicPageQuery(
    new URLSearchParams('site=omnia-hub&site=other&slug=home'),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, 'duplicate_params');
  }
});

test('parâmetros extensos são rejeitados', () => {
  const long = 'a'.repeat(PUBLIC_PAGE_PARAM_MAX_LENGTH + 1);
  assert.equal(validatePublicPageQuery(new URLSearchParams(`site=${long}&slug=home`)).ok, false);
  assert.equal(
    validatePublicPageQuery(new URLSearchParams(`site=omnia-hub&slug=${long}`)).ok,
    false,
  );
});

test('chave extra rejeitada', () => {
  const result = validatePublicPageQuery(
    new URLSearchParams('site=omnia-hub&slug=home&collection=pages'),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, 'extra_params');
  }
});

test('DTO mínimo: somente campos públicos allowlist', () => {
  const dto = mapPageDocumentToPublicDto(publishedDoc);
  assert.ok(dto);
  assert.deepEqual(Object.keys(dto).sort(), [
    'blocks',
    'id',
    'pageType',
    'seo',
    'site',
    'slug',
    'title',
  ]);
  assert.equal('tenant' in dto, false);
  assert.equal('company' in dto, false);
  assert.equal('_status' in dto, false);
});

test('ordem dos blocks é preservada', () => {
  const dto = mapPageDocumentToPublicDto(publishedDoc);
  assert.ok(dto);
  assert.deepEqual(
    dto.blocks.map((b) => b.blockType),
    ['hero', 'institutionalIntro', 'missionVision', 'values', 'features', 'companies'],
  );
});

test('Hero / blocos institucionais / Features / Companies válidos', () => {
  assert.equal(mapPublicPageBlock(publishedDoc.layout[0])?.blockType, 'hero');
  assert.equal(mapPublicPageBlock(publishedDoc.layout[1])?.blockType, 'institutionalIntro');
  assert.equal(mapPublicPageBlock(publishedDoc.layout[2])?.blockType, 'missionVision');
  assert.equal(mapPublicPageBlock(publishedDoc.layout[3])?.blockType, 'values');
  assert.equal(mapPublicPageBlock(publishedDoc.layout[4])?.blockType, 'features');
  assert.equal(mapPublicPageBlock(publishedDoc.layout[5])?.blockType, 'companies');
});

test('unknown block é ignorado conforme contrato', () => {
  const dto = mapPublicPage({
    id: '1',
    site: { id: '3', slug: 'omnia-hub' },
    title: 'Home',
    slug: 'home',
    pageType: 'home',
    blocks: [
      publishedDoc.layout[0],
      { blockType: 'video', url: 'https://example.com' },
      publishedDoc.layout[5],
    ],
    seo: {},
  });
  assert.ok(dto);
  assert.deepEqual(
    dto.blocks.map((b) => b.blockType),
    ['hero', 'companies'],
  );
});

test('bloco conhecido inválido rejeita o mapa', () => {
  assert.equal(mapPublicPageBlock({ blockType: 'hero', title: '   ' }), null);
});

test('URLs proibidas e canonical maliciosa', () => {
  assert.equal(sanitizePublicHref('javascript:alert(1)'), null);
  assert.equal(sanitizePublicCanonicalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizePublicCanonicalUrl('data:text/html,x'), null);
  assert.equal(sanitizePublicCanonicalUrl('//evil.example'), null);
  assert.equal(
    sanitizePublicCanonicalUrl('https://omniafrigo.com.br/'),
    'https://omniafrigo.com.br/',
  );
});

test('limite de blocks é respeitado', () => {
  const tooMany = Array.from({ length: PUBLIC_PAGE_MAX_BLOCKS + 1 }, () => ({
    blockType: 'companies',
    layout: 'grid',
    limit: 6,
  }));
  assert.equal(
    mapPublicPage({
      id: '1',
      site: { id: '3', slug: 'omnia-hub' },
      title: 'Home',
      slug: 'home',
      pageType: 'home',
      blocks: tooMany,
      seo: {},
    }),
    null,
  );
});

test('uma Home por site — create e update sem falso conflito', () => {
  const store: PageUniquenessRecord[] = [{ id: 1, siteId: 3, slug: 'home', pageType: 'home' }];
  assert.equal(hasHomePerSiteConflict(store, { siteId: 3, slug: 'outra', pageType: 'home' }), true);
  assert.equal(
    hasHomePerSiteConflict(store, { id: 1, siteId: 3, slug: 'home', pageType: 'home' }),
    false,
  );
});

test('unicidade site + slug e mesmo slug em sites diferentes', () => {
  const store: PageUniquenessRecord[] = [{ id: 1, siteId: 3, slug: 'home', pageType: 'home' }];
  assert.equal(hasSiteSlugConflict(store, { siteId: 3, slug: 'home', pageType: 'standard' }), true);
  assert.equal(hasSiteSlugConflict(store, { siteId: 9, slug: 'home', pageType: 'home' }), false);
  assert.equal(normalizePageSlug(' Home Omnia '), 'home-omnia');
});

test('Cache-Control do endpoint público', () => {
  assert.equal(PUBLIC_PAGE_CACHE_CONTROL, 'public, s-maxage=60, stale-while-revalidate=30');
});

test('seed: Home existente → skip', () => {
  const decision = decideHoldingHomeSeed({
    siteFound: true,
    siteSlug: 'omnia-hub',
    existingHome: { id: 1, slug: 'home', pageType: 'home' },
    existingBySlugHome: { id: 1, slug: 'home', pageType: 'home' },
  });
  assert.equal(decision.action, 'skip');
  if (decision.action === 'skip') {
    assert.equal(decision.reason, 'home_exists');
  }
});

test('seed: Home com outro slug → skip (não cria segunda)', () => {
  const decision = decideHoldingHomeSeed({
    siteFound: true,
    siteSlug: 'omnia-hub',
    existingHome: { id: 2, slug: 'inicio', pageType: 'home' },
    existingBySlugHome: null,
  });
  assert.equal(decision.action, 'skip');
  if (decision.action === 'skip') {
    assert.equal(decision.reason, 'home_exists');
  }
});

test('seed: slug home ocupado por standard → skip sem sobrescrever', () => {
  const decision = decideHoldingHomeSeed({
    siteFound: true,
    siteSlug: 'omnia-hub',
    existingHome: null,
    existingBySlugHome: { id: 9, slug: 'home', pageType: 'standard' },
  });
  assert.equal(decision.action, 'skip');
  if (decision.action === 'skip') {
    assert.equal(decision.reason, 'slug_home_occupied');
  }
});

test('seed: site inexistente → abort', () => {
  const decision = decideHoldingHomeSeed({
    siteFound: false,
    siteSlug: 'omnia-hub',
    existingHome: null,
    existingBySlugHome: null,
  });
  assert.equal(decision.action, 'abort');
});

test('seed: reexecução cria no máximo uma vez (segunda é skip)', () => {
  const first = decideHoldingHomeSeed({
    siteFound: true,
    siteSlug: 'omnia-hub',
    existingHome: null,
    existingBySlugHome: null,
  });
  assert.equal(first.action, 'create');
  const second = decideHoldingHomeSeed({
    siteFound: true,
    siteSlug: 'omnia-hub',
    existingHome: { id: 1, slug: 'home', pageType: 'home' },
    existingBySlugHome: { id: 1, slug: 'home', pageType: 'home' },
  });
  assert.equal(second.action, 'skip');
});

test('seed layout mapeia para DTO válido', () => {
  const mapped = mapPageDocumentToPublicDto({
    id: '99',
    title: holdingHomeSeed.title,
    slug: holdingHomeSeed.slug,
    pageType: holdingHomeSeed.pageType,
    site: { id: '3', slug: holdingHomeSeed.siteSlug },
    layout: holdingHomeSeed.layout,
    seo: holdingHomeSeed.seo,
  });
  assert.ok(mapped);
  assert.equal((mapped as PublicPageDto).blocks[0]?.blockType, 'hero');
});

test('migration institucional snapshot JSON não é placeholder', () => {
  const snapshotPath = path.join(migrationsDir, '20260716_172340_pages_institutional.json');
  assert.equal(fs.existsSync(snapshotPath), true);
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as {
    tables?: Record<string, unknown>;
    enums?: Record<string, unknown>;
    notes?: string;
  };
  assert.ok(snapshot.tables);
  assert.ok(Object.keys(snapshot.tables).length >= 5);
  assert.ok(snapshot.enums);
  assert.ok('public.pages_blocks_institutional_intro' in snapshot.tables);
  assert.ok('public.pages_blocks_mission_vision' in snapshot.tables);
  assert.ok('public.pages_blocks_values' in snapshot.tables);
  assert.ok(!snapshot.notes?.includes('placeholder'));
});

test('migration institucional TS declara tabelas essenciais', () => {
  const ts = fs.readFileSync(
    path.join(migrationsDir, '20260716_172340_pages_institutional.ts'),
    'utf8',
  );
  for (const token of [
    'CREATE TABLE "pages_blocks_institutional_intro"',
    'CREATE TABLE "pages_blocks_mission_vision"',
    'CREATE TABLE "pages_blocks_values"',
    'CREATE TABLE "pages_blocks_values_items"',
    'enum_pages_blocks_values_items_icon_key',
    'ethics',
    'results',
  ]) {
    assert.equal(ts.includes(token), true, `missing token: ${token}`);
  }
});

test('migration Pages baseline preserva índices de integridade no TS oficial', () => {
  const ts = fs.readFileSync(path.join(migrationsDir, '20260716_124305_pages.ts'), 'utf8');
  assert.equal(ts.includes('pages_site_slug_unique'), true);
  assert.equal(ts.includes('pages_one_home_per_site'), true);
  assert.equal(ts.includes('WHERE "page_type" = \'home\''), true);
});

test('snapshot canônico é o lexicograficamente mais recente (institucional)', () => {
  const jsons = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse();
  assert.equal(jsons[0], '20260716_172340_pages_institutional.json');
});

test('compatibilidade: página legada com hero → features → companies', () => {
  const legacyDto = mapPageDocumentToPublicDto({
    ...publishedDoc,
    layout: publishedDoc.layout.filter((b) =>
      ['hero', 'features', 'companies'].includes((b as { blockType: string }).blockType),
    ),
  });
  assert.ok(legacyDto);
  assert.equal(legacyDto.blocks.length, 3);
  assert.deepEqual(
    legacyDto.blocks.map((b) => b.blockType),
    ['hero', 'features', 'companies'],
  );
});

test('fallback Web: Hero/Features defaults institucionais (sem Sprint 2)', () => {
  const heroPath = path.resolve(__dirname, '../../../web/src/components/home/Hero.tsx');
  const featuresPath = path.resolve(
    __dirname,
    '../../../web/src/components/home/FeaturesSection.tsx',
  );
  const hero = fs.readFileSync(heroPath, 'utf8');
  const features = fs.readFileSync(featuresPath, 'utf8');
  assert.equal(hero.includes('Ecossistema Omnia Frigo Holding'), true);
  assert.equal(hero.includes('Sprint 2'), false);
  assert.equal(features.includes('Um ecossistema integrado'), true);
  assert.equal(features.includes('Sprint 2'), false);
  assert.equal(features.includes('Platform Base'), false);
});

test('fallback Web: BlockRenderer registra blocos institucionais', () => {
  const rendererPath = path.resolve(
    __dirname,
    '../../../web/src/components/home/BlockRenderer.tsx',
  );
  const renderer = fs.readFileSync(rendererPath, 'utf8');
  assert.equal(renderer.includes("case 'institutionalIntro'"), true);
  assert.equal(renderer.includes("case 'missionVision'"), true);
  assert.equal(renderer.includes("case 'values'"), true);
});

test('deduplicação Web: loadHomePage e fetchCompanies usam cache()', () => {
  const pagePath = path.resolve(__dirname, '../../../web/src/app/page.tsx');
  const cmsPath = path.resolve(__dirname, '../../../web/src/lib/cms.ts');
  const page = fs.readFileSync(pagePath, 'utf8');
  const cms = fs.readFileSync(cmsPath, 'utf8');
  assert.equal(page.includes('cache(async'), true);
  assert.equal(cms.includes('cache(async'), true);
  assert.equal(cms.includes('fetchCompaniesCached'), true);
});

console.log(`\n${passed} testes passaram.`);
