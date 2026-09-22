/* eslint-disable no-console -- test harness output */
import assert from 'node:assert/strict';

import { holdingHomeSeed } from '../seed/holding-home';
import {
  formatHoldingHomeSeedLog,
  runHoldingHomeSeed,
  type HoldingHomeSeedPayload,
} from '../seed/run-holding-home';

let passed = 0;

const test = async (name: string, fn: () => void | Promise<void>): Promise<void> => {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

type StoredPage = {
  id: number;
  site: number;
  slug: string;
  pageType: string;
  title?: string;
  layout?: unknown;
  seo?: unknown;
  _status?: string;
};

type MockState = {
  sites: Array<{ id: number; slug: string }>;
  pages: StoredPage[];
  creates: Array<{ collection: string; data: Record<string, unknown> }>;
  updates: Array<{ collection: string }>;
  finds: Array<{ collection: string }>;
  nextPageId: number;
};

const createMockPayload = (state: MockState): HoldingHomeSeedPayload => ({
  find: async ({ collection, where }) => {
    state.finds.push({ collection });

    if (collection === 'sites') {
      const slugEquals =
        where &&
        typeof where === 'object' &&
        where !== null &&
        'slug' in where &&
        typeof (where as { slug?: { equals?: string } }).slug === 'object'
          ? (where as { slug: { equals?: string } }).slug.equals
          : undefined;
      const docs = state.sites.filter((site) =>
        slugEquals === undefined ? true : site.slug === slugEquals,
      );
      return { docs };
    }

    if (collection === 'pages') {
      const and =
        where &&
        typeof where === 'object' &&
        where !== null &&
        'and' in where &&
        Array.isArray((where as { and: unknown }).and)
          ? (where as { and: Array<Record<string, { equals?: unknown }>> }).and
          : [];

      let siteId: number | undefined;
      let pageType: string | undefined;
      let slug: string | undefined;

      for (const clause of and) {
        if (clause.site?.equals !== undefined) siteId = Number(clause.site.equals);
        if (clause.pageType?.equals !== undefined) pageType = String(clause.pageType.equals);
        if (clause.slug?.equals !== undefined) slug = String(clause.slug.equals);
      }

      const docs = state.pages.filter((page) => {
        if (siteId !== undefined && page.site !== siteId) return false;
        if (pageType !== undefined && page.pageType !== pageType) return false;
        if (slug !== undefined && page.slug !== slug) return false;
        return true;
      });

      return { docs };
    }

    throw new Error(`find inesperado na collection: ${collection}`);
  },
  create: async ({ collection, data }) => {
    state.creates.push({ collection, data });

    if (collection !== 'pages') {
      throw new Error(`create proibido na collection: ${collection}`);
    }

    const id = state.nextPageId;
    state.nextPageId += 1;
    state.pages.push({
      id,
      site: Number(data.site),
      slug: String(data.slug),
      pageType: String(data.pageType),
      title: data.title as string | undefined,
      layout: data.layout,
      seo: data.seo,
      _status: data._status as string | undefined,
    });
    return { id };
  },
});

const assertNoSideCollections = (state: MockState): void => {
  const forbidden = new Set(['tenants', 'companies', 'domains', 'global-settings']);
  for (const call of state.creates) {
    assert.equal(call.collection, 'pages');
    assert.ok(!forbidden.has(call.collection));
  }
  assert.equal(state.updates.length, 0);
  for (const call of state.finds) {
    assert.ok(call.collection === 'sites' || call.collection === 'pages');
  }
};

await test('site omnia-hub ausente → abort e não cria', async () => {
  const state: MockState = {
    sites: [],
    pages: [],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 1,
  };
  const outcome = await runHoldingHomeSeed(createMockPayload(state));
  assert.deepEqual(outcome, { status: 'aborted', reason: 'site_not_found' });
  assert.equal(state.creates.length, 0);
  assert.equal(formatHoldingHomeSeedLog(outcome), 'holding-home: aborted: site_not_found');
  assertNoSideCollections(state);
});

await test('Home existente com qualquer slug → não sobrescreve', async () => {
  const state: MockState = {
    sites: [{ id: 3, slug: 'omnia-hub' }],
    pages: [{ id: 10, site: 3, slug: 'inicio', pageType: 'home', _status: 'published' }],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 11,
  };
  const outcome = await runHoldingHomeSeed(createMockPayload(state));
  assert.deepEqual(outcome, { status: 'skipped', reason: 'home_exists' });
  assert.equal(state.creates.length, 0);
  assert.equal(state.pages.length, 1);
  assert.equal(formatHoldingHomeSeedLog(outcome), 'holding-home: skipped: home_exists');
  assertNoSideCollections(state);
});

await test('slug home ocupado por standard → não cria', async () => {
  const state: MockState = {
    sites: [{ id: 3, slug: 'omnia-hub' }],
    pages: [{ id: 9, site: 3, slug: 'home', pageType: 'standard', _status: 'published' }],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 10,
  };
  const outcome = await runHoldingHomeSeed(createMockPayload(state));
  assert.deepEqual(outcome, { status: 'skipped', reason: 'slug_home_occupied' });
  assert.equal(state.creates.length, 0);
  assert.equal(formatHoldingHomeSeedLog(outcome), 'holding-home: skipped: slug_home_occupied');
  assertNoSideCollections(state);
});

await test('caminho limpo → cria uma única página published com blocos na ordem', async () => {
  const state: MockState = {
    sites: [{ id: 3, slug: 'omnia-hub' }],
    pages: [],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 1,
  };
  const outcome = await runHoldingHomeSeed(createMockPayload(state));
  assert.equal(outcome.status, 'created');
  if (outcome.status === 'created') {
    assert.equal(outcome.pageId, 1);
  }
  assert.equal(state.creates.length, 1);
  assert.equal(state.creates[0]?.collection, 'pages');
  const data = state.creates[0]!.data;
  assert.equal(data.slug, 'home');
  assert.equal(data.pageType, 'home');
  assert.equal(data._status, 'published');
  assert.equal(data.site, 3);
  assert.equal(data.title, holdingHomeSeed.title);
  const layout = data.layout as Array<{ blockType: string }>;
  assert.deepEqual(
    layout.map((block) => block.blockType),
    ['hero', 'institutionalIntro', 'missionVision', 'values', 'features', 'companies'],
  );
  assert.equal(formatHoldingHomeSeedLog(outcome), 'holding-home: created');
  assertNoSideCollections(state);
});

await test('segunda execução → skip home_exists', async () => {
  const state: MockState = {
    sites: [{ id: 3, slug: 'omnia-hub' }],
    pages: [],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 1,
  };
  const payload = createMockPayload(state);
  const first = await runHoldingHomeSeed(payload);
  assert.equal(first.status, 'created');
  const second = await runHoldingHomeSeed(payload);
  assert.deepEqual(second, { status: 'skipped', reason: 'home_exists' });
  assert.equal(state.creates.length, 1);
  assertNoSideCollections(state);
});

await test('nunca cria/atualiza tenants, companies, sites, domains ou global-settings', async () => {
  const state: MockState = {
    sites: [{ id: 3, slug: 'omnia-hub' }],
    pages: [],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 1,
  };
  await runHoldingHomeSeed(createMockPayload(state));
  assert.equal(
    state.creates.every((call) => call.collection === 'pages'),
    true,
  );
  assert.equal(state.updates.length, 0);
  assert.equal(
    state.finds.every((call) => call.collection === 'sites' || call.collection === 'pages'),
    true,
  );
  assert.equal(
    state.finds.some((call) => call.collection === 'sites'),
    true,
  );
});

await test('create em collection estranha falha de forma controlada', async () => {
  const payload: HoldingHomeSeedPayload = {
    find: async ({ collection }) => {
      if (collection === 'sites') return { docs: [{ id: 3, slug: 'omnia-hub' }] };
      return { docs: [] };
    },
    create: async () => {
      throw new Error('simulated failure');
    },
  };

  await assert.rejects(() => runHoldingHomeSeed(payload), /simulated failure/);
});

await test('logs sanitizados não incluem documento nem segredo', () => {
  const samples = [
    formatHoldingHomeSeedLog({ status: 'created', pageId: 99 }),
    formatHoldingHomeSeedLog({ status: 'skipped', reason: 'home_exists' }),
    formatHoldingHomeSeedLog({ status: 'skipped', reason: 'slug_home_occupied' }),
    formatHoldingHomeSeedLog({ status: 'aborted', reason: 'site_not_found' }),
  ];
  for (const line of samples) {
    assert.match(line, /^holding-home: /);
    assert.equal(line.includes('PAYLOAD'), false);
    assert.equal(line.includes('password'), false);
    assert.equal(line.includes('DATABASE'), false);
    assert.equal(line.includes('layout'), false);
    assert.equal(line.includes('metaDescription'), false);
    assert.equal(line.includes('{'), false);
  }
});

console.log(`\n${passed} testes passaram.`);
