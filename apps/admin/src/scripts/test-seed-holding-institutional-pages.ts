/**
 * Testes unitários do seed das páginas institucionais (sem DB).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  decideInstitutionalPageSeed,
  holdingInstitutionalPagesSeed,
} from '../seed/holding-institutional-pages';
import {
  formatHoldingInstitutionalPagesSeedLog,
  hasInstitutionalPagesSeedAbort,
  runHoldingInstitutionalPagesSeed,
  type HoldingInstitutionalPagesSeedPayload,
} from '../seed/run-holding-institutional-pages';

describe('decideInstitutionalPageSeed', () => {
  it('aborta quando o site não existe', () => {
    const decision = decideInstitutionalPageSeed({
      siteFound: false,
      siteSlug: 'omnia-hub',
      pageSlug: 'sobre',
      existingBySlug: null,
    });
    assert.equal(decision.action, 'abort');
  });

  it('ignora quando o slug já existe', () => {
    const decision = decideInstitutionalPageSeed({
      siteFound: true,
      siteSlug: 'omnia-hub',
      pageSlug: 'sobre',
      existingBySlug: { id: 9, slug: 'sobre', pageType: 'standard' },
    });
    assert.equal(decision.action, 'skip');
    if (decision.action === 'skip') {
      assert.equal(decision.reason, 'slug_exists');
    }
  });

  it('cria quando o slug está livre', () => {
    const decision = decideInstitutionalPageSeed({
      siteFound: true,
      siteSlug: 'omnia-hub',
      pageSlug: 'contato',
      existingBySlug: null,
    });
    assert.equal(decision.action, 'create');
  });
});

describe('holdingInstitutionalPagesSeed', () => {
  it('define as três páginas institucionais canônicas', () => {
    assert.deepEqual(
      holdingInstitutionalPagesSeed.map((page) => page.slug),
      ['sobre', 'empresas', 'contato'],
    );
    assert.ok(holdingInstitutionalPagesSeed.every((page) => page.pageType === 'standard'));
  });
});

describe('runHoldingInstitutionalPagesSeed', () => {
  it('cria páginas ausentes e ignora existentes', async () => {
    const created: string[] = [];
    const payload: HoldingInstitutionalPagesSeedPayload = {
      find: async (args) => {
        if (args.collection === 'sites') {
          return { docs: [{ id: 1, slug: 'omnia-hub' }] };
        }

        const where = args.where as { and?: Array<{ slug?: { equals?: string } }> };
        const slug = where.and?.find((clause) => clause.slug)?.slug?.equals;
        if (slug === 'sobre') {
          return { docs: [{ id: 10, slug: 'sobre', pageType: 'standard' }] };
        }
        return { docs: [] };
      },
      create: async (args) => {
        const slug = String(args.data.slug);
        created.push(slug);
        return { id: created.length + 100 };
      },
    };

    const outcome = await runHoldingInstitutionalPagesSeed(payload);
    assert.deepEqual(
      outcome.items.map((item) => `${item.slug}:${item.status}`),
      ['sobre:skipped', 'empresas:created', 'contato:created'],
    );
    assert.deepEqual(created, ['empresas', 'contato']);
    assert.equal(hasInstitutionalPagesSeedAbort(outcome), false);
    assert.match(formatHoldingInstitutionalPagesSeedLog(outcome), /sobre:skipped/);
  });

  it('marca abort quando o site não existe', async () => {
    const payload: HoldingInstitutionalPagesSeedPayload = {
      find: async () => ({ docs: [] }),
      create: async () => {
        throw new Error('não deve criar');
      },
    };

    const outcome = await runHoldingInstitutionalPagesSeed(payload);
    assert.equal(hasInstitutionalPagesSeedAbort(outcome), true);
    assert.ok(outcome.items.every((item) => item.status === 'aborted'));
  });
});
