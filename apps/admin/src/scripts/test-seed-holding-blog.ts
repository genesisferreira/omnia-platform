/**
 * Testes unitários do seed do Blog (sem DB).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLexicalContent,
  decideBlogSeedItem,
  holdingBlogAuthorSeed,
  holdingBlogCategoriesSeed,
  holdingBlogPostsSeed,
  holdingBlogTagsSeed,
} from '../seed/holding-blog';
import {
  formatHoldingBlogSeedLog,
  hasHoldingBlogSeedAbort,
  runHoldingBlogSeed,
  type HoldingBlogSeedPayload,
} from '../seed/run-holding-blog';

describe('decideBlogSeedItem', () => {
  it('aborta quando o site não existe', () => {
    const decision = decideBlogSeedItem({
      siteFound: false,
      siteSlug: 'omnia-hub',
      entityLabel: 'Post',
      entitySlug: 'bem-vindo-ao-blog-omnia',
      existingBySlug: null,
    });
    assert.equal(decision.action, 'abort');
  });

  it('ignora quando o slug já existe', () => {
    const decision = decideBlogSeedItem({
      siteFound: true,
      siteSlug: 'omnia-hub',
      entityLabel: 'Categoria',
      entitySlug: 'institucional',
      existingBySlug: { id: 3, slug: 'institucional' },
    });
    assert.equal(decision.action, 'skip');
    if (decision.action === 'skip') {
      assert.equal(decision.reason, 'slug_exists');
    }
  });

  it('cria quando o slug está livre', () => {
    const decision = decideBlogSeedItem({
      siteFound: true,
      siteSlug: 'omnia-hub',
      entityLabel: 'Tag',
      entitySlug: 'inovacao',
      existingBySlug: null,
    });
    assert.equal(decision.action, 'create');
  });
});

describe('holding blog seed data', () => {
  it('define autor, categorias, tags e posts canônicos', () => {
    assert.equal(holdingBlogAuthorSeed.slug, 'equipe-omnia');
    assert.deepEqual(
      holdingBlogCategoriesSeed.map((item) => item.slug),
      ['institucional', 'tecnologia'],
    );
    assert.deepEqual(
      holdingBlogTagsSeed.map((item) => item.slug),
      ['holding', 'refrigeracao', 'inovacao'],
    );
    assert.equal(holdingBlogPostsSeed.length, 3);
    assert.ok(holdingBlogPostsSeed.every((post) => post.content.root));
  });

  it('buildLexicalContent gera root Lexical com heading e paragraph', () => {
    const content = buildLexicalContent([{ heading: 'Título', body: 'Corpo' }]);
    const root = content.root as { type: string; children: Array<{ type: string }> };
    assert.equal(root.type, 'root');
    assert.equal(root.children[0]?.type, 'heading');
    assert.equal(root.children[1]?.type, 'paragraph');
  });
});

describe('runHoldingBlogSeed', () => {
  it('cria itens ausentes e ignora existentes', async () => {
    const created: string[] = [];
    const payload: HoldingBlogSeedPayload = {
      find: async (args) => {
        if (args.collection === 'sites') {
          return { docs: [{ id: 1, slug: 'omnia-hub' }] };
        }

        const where = args.where as {
          slug?: { equals?: string };
          and?: Array<{ slug?: { equals?: string } }>;
        };
        const slug = where.slug?.equals ?? where.and?.find((clause) => clause.slug)?.slug?.equals;

        if (args.collection === 'authors' && slug === 'equipe-omnia') {
          return { docs: [{ id: 10, slug: 'equipe-omnia' }] };
        }
        if (args.collection === 'categories' && slug === 'institucional') {
          return { docs: [{ id: 20, slug: 'institucional' }] };
        }
        if (args.collection === 'tags' && slug === 'holding') {
          return { docs: [{ id: 30, slug: 'holding' }] };
        }
        if (args.collection === 'posts' && slug === 'bem-vindo-ao-blog-omnia') {
          return { docs: [{ id: 40, slug: 'bem-vindo-ao-blog-omnia' }] };
        }

        return { docs: [] };
      },
      create: async (args) => {
        const slug = String(args.data.slug);
        created.push(`${args.collection}:${slug}`);
        return { id: created.length + 100 };
      },
    };

    const outcome = await runHoldingBlogSeed(payload);
    assert.equal(hasHoldingBlogSeedAbort(outcome), false);
    assert.ok(outcome.items.some((item) => item.kind === 'author' && item.status === 'skipped'));
    assert.ok(
      outcome.items.some(
        (item) =>
          item.kind === 'category' && item.slug === 'institucional' && item.status === 'skipped',
      ),
    );
    assert.ok(
      outcome.items.some(
        (item) =>
          item.kind === 'category' && item.slug === 'tecnologia' && item.status === 'created',
      ),
    );
    assert.ok(
      outcome.items.some(
        (item) => item.kind === 'tag' && item.slug === 'holding' && item.status === 'skipped',
      ),
    );
    assert.ok(
      outcome.items.some(
        (item) =>
          item.kind === 'post' &&
          item.slug === 'bem-vindo-ao-blog-omnia' &&
          item.status === 'skipped',
      ),
    );
    assert.ok(created.includes('categories:tecnologia'));
    assert.ok(created.some((entry) => entry.startsWith('posts:')));
    assert.match(formatHoldingBlogSeedLog(outcome), /author:equipe-omnia:skipped/);
  });

  it('marca abort quando o site não existe', async () => {
    const payload: HoldingBlogSeedPayload = {
      find: async () => ({ docs: [] }),
      create: async () => {
        throw new Error('não deve criar');
      },
    };

    const outcome = await runHoldingBlogSeed(payload);
    assert.equal(hasHoldingBlogSeedAbort(outcome), true);
    assert.ok(outcome.items.every((item) => item.status === 'aborted'));
  });
});
