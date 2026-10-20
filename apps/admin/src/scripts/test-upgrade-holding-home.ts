/* eslint-disable no-console -- test harness output */
import assert from 'node:assert/strict';

import {
  holdingHomeBaselineLayout,
  holdingHomeFullLayout,
  holdingHomeInstitutionalBlocks,
} from '../seed/holding-home-institutional';
import { holdingHomeSeed } from '../seed/holding-home';
import {
  baselineLayoutFingerprint,
  formatHoldingHomeUpgradeLog,
  fullLayoutFingerprint,
  runHoldingHomeUpgrade,
  type HoldingHomeUpgradePayload,
} from '../seed/upgrade-holding-home';

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
  updates: Array<{ collection: string; id: number; data: Record<string, unknown> }>;
  finds: Array<{ collection: string }>;
  nextPageId: number;
};

const createMockPayload = (state: MockState): HoldingHomeUpgradePayload => ({
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
  update: async ({ collection, id, data }) => {
    state.updates.push({ collection, id: Number(id), data });

    if (collection !== 'pages') {
      throw new Error(`update proibido na collection: ${collection}`);
    }

    const page = state.pages.find((p) => p.id === Number(id));
    if (!page) {
      throw new Error('page not found');
    }
    if (data.layout !== undefined) page.layout = data.layout;
    if (data._status !== undefined) page._status = String(data._status);
    return { id };
  },
});

const assertPagesOnly = (state: MockState): void => {
  const forbidden = new Set(['tenants', 'companies', 'domains', 'global-settings', 'sites']);
  for (const call of state.creates) {
    assert.equal(call.collection, 'pages');
    assert.ok(!forbidden.has(call.collection));
  }
  for (const call of state.updates) {
    assert.equal(call.collection, 'pages');
    assert.ok(!forbidden.has(call.collection));
  }
  for (const call of state.finds) {
    assert.ok(call.collection === 'sites' || call.collection === 'pages');
  }
};

await test('site omnia-hub ausente → abort', async () => {
  const state: MockState = {
    sites: [],
    pages: [],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 1,
  };
  const outcome = await runHoldingHomeUpgrade(createMockPayload(state));
  assert.deepEqual(outcome, { status: 'aborted', reason: 'site_not_found' });
  assert.equal(state.creates.length, 0);
  assertPagesOnly(state);
});

await test('Home ausente → cria layout completo com 6 blocos', async () => {
  const state: MockState = {
    sites: [{ id: 3, slug: 'omnia-hub' }],
    pages: [],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 1,
  };
  const outcome = await runHoldingHomeUpgrade(createMockPayload(state));
  assert.equal(outcome.status, 'created');
  assert.equal(state.creates.length, 1);
  const layout = state.creates[0]!.data.layout as Array<{ blockType: string }>;
  assert.deepEqual(
    layout.map((b) => b.blockType),
    ['hero', 'institutionalIntro', 'missionVision', 'values', 'features', 'companies'],
  );
  assert.equal(state.creates[0]!.data.title, holdingHomeSeed.title);
  assertPagesOnly(state);
});

await test('Home baseline F4C → upgrade com blocos institucionais preservando hero/features/companies', async () => {
  const state: MockState = {
    sites: [{ id: 3, slug: 'omnia-hub' }],
    pages: [
      {
        id: 10,
        site: 3,
        slug: 'home',
        pageType: 'home',
        layout: structuredClone(holdingHomeBaselineLayout),
        _status: 'published',
      },
    ],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 11,
  };
  const outcome = await runHoldingHomeUpgrade(createMockPayload(state));
  assert.deepEqual(outcome, { status: 'upgraded', pageId: 10 });
  assert.equal(state.updates.length, 1);
  assert.equal(state.creates.length, 0);
  const layout = state.pages[0]!.layout as Array<{ blockType: string }>;
  assert.deepEqual(
    layout.map((b) => b.blockType),
    ['hero', 'institutionalIntro', 'missionVision', 'values', 'features', 'companies'],
  );
  const intro = layout[1] as { blockType: string; title: string };
  assert.equal(intro.blockType, 'institutionalIntro');
  assert.equal(intro.title, holdingHomeInstitutionalBlocks[0]!.title);
  assertPagesOnly(state);
});

await test('Home já atualizada → skipped already_current', async () => {
  const state: MockState = {
    sites: [{ id: 3, slug: 'omnia-hub' }],
    pages: [
      {
        id: 10,
        site: 3,
        slug: 'home',
        pageType: 'home',
        layout: structuredClone(holdingHomeFullLayout),
        _status: 'published',
      },
    ],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 11,
  };
  const outcome = await runHoldingHomeUpgrade(createMockPayload(state));
  assert.deepEqual(outcome, { status: 'skipped', reason: 'already_current' });
  assert.equal(state.updates.length, 0);
  assert.equal(state.creates.length, 0);
});

await test('conteúdo manual divergente → manual_review_required', async () => {
  const state: MockState = {
    sites: [{ id: 3, slug: 'omnia-hub' }],
    pages: [
      {
        id: 10,
        site: 3,
        slug: 'home',
        pageType: 'home',
        layout: [
          { blockType: 'hero', title: 'Título customizado pelo editor' },
          { blockType: 'features', title: 'X', items: [] },
          { blockType: 'companies', limit: 6 },
        ],
        _status: 'published',
      },
    ],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 11,
  };
  const outcome = await runHoldingHomeUpgrade(createMockPayload(state));
  assert.deepEqual(outcome, { status: 'aborted', reason: 'manual_review_required' });
  assert.equal(state.updates.length, 0);
});

await test('segunda execução após upgrade → idempotente', async () => {
  const state: MockState = {
    sites: [{ id: 3, slug: 'omnia-hub' }],
    pages: [
      {
        id: 10,
        site: 3,
        slug: 'home',
        pageType: 'home',
        layout: structuredClone(holdingHomeBaselineLayout),
        _status: 'published',
      },
    ],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 11,
  };
  const payload = createMockPayload(state);
  const first = await runHoldingHomeUpgrade(payload);
  assert.equal(first.status, 'upgraded');
  const second = await runHoldingHomeUpgrade(payload);
  assert.deepEqual(second, { status: 'skipped', reason: 'already_current' });
  assert.equal(state.updates.length, 1);
});

await test('fingerprints baseline e full são estáveis', async () => {
  assert.equal(baselineLayoutFingerprint(), baselineLayoutFingerprint());
  assert.equal(fullLayoutFingerprint(), fullLayoutFingerprint());
  assert.notEqual(baselineLayoutFingerprint(), fullLayoutFingerprint());
});

await test('logs sanitizados', async () => {
  const lines = [
    formatHoldingHomeUpgradeLog({ status: 'created', pageId: 1 }),
    formatHoldingHomeUpgradeLog({ status: 'upgraded', pageId: 2 }),
    formatHoldingHomeUpgradeLog({ status: 'skipped', reason: 'already_current' }),
    formatHoldingHomeUpgradeLog({ status: 'aborted', reason: 'manual_review_required' }),
    formatHoldingHomeUpgradeLog({ status: 'aborted', reason: 'site_not_found' }),
  ];
  for (const line of lines) {
    assert.match(line, /^holding-home-upgrade: /);
    assert.equal(line.includes('{'), false);
    assert.equal(line.includes('layout'), false);
    assert.equal(line.includes('PAYLOAD'), false);
  }
});

await test('execução limitada exclusivamente a Pages (find sites + pages)', async () => {
  const state: MockState = {
    sites: [{ id: 3, slug: 'omnia-hub' }],
    pages: [],
    creates: [],
    updates: [],
    finds: [],
    nextPageId: 1,
  };
  await runHoldingHomeUpgrade(createMockPayload(state));
  assert.equal(
    state.finds.every((f) => f.collection === 'sites' || f.collection === 'pages'),
    true,
  );
  assert.equal(
    state.creates.every((c) => c.collection === 'pages'),
    true,
  );
  assert.equal(state.updates.length, 0);
});

console.log(`\n${passed} testes passaram.`);
