/**
 * Testes — construção resiliente do Sitemap (Release 2.1.1).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildSitemapEntries,
  buildStaticSitemapEntries,
  dedupeSitemapEntries,
  isValidPublicSlug,
  parseSafeLastModified,
  toAbsoluteUrl,
} from '../lib/seo/sitemap-entries';

describe('parseSafeLastModified', () => {
  it('aceita ISO válido', () => {
    const date = parseSafeLastModified('2026-07-17T12:00:00.000Z');
    assert.ok(date);
    assert.equal(date.toISOString(), '2026-07-17T12:00:00.000Z');
  });

  it('ignora data inválida sem lançar RangeError', () => {
    assert.equal(parseSafeLastModified('not-a-date'), undefined);
    assert.equal(parseSafeLastModified(''), undefined);
    assert.equal(parseSafeLastModified(null), undefined);
    assert.doesNotThrow(() => {
      const d = parseSafeLastModified('invalid');
      if (d) {
        d.toISOString();
      }
    });
  });
});

describe('isValidPublicSlug / toAbsoluteUrl / dedupe', () => {
  it('valida slugs', () => {
    assert.equal(isValidPublicSlug('renovacao'), true);
    assert.equal(isValidPublicSlug(''), false);
    assert.equal(isValidPublicSlug('Bad Slug'), false);
    assert.equal(isValidPublicSlug(undefined), false);
  });

  it('monta URLs absolutas', () => {
    assert.equal(toAbsoluteUrl('https://omniafrigo.com.br', '/'), 'https://omniafrigo.com.br');
    assert.equal(
      toAbsoluteUrl('https://omniafrigo.com.br/', '/blog'),
      'https://omniafrigo.com.br/blog',
    );
  });

  it('remove URLs duplicadas', () => {
    const deduped = dedupeSitemapEntries([
      { url: 'https://omniafrigo.com.br/' },
      { url: 'https://omniafrigo.com.br/' },
      { url: 'https://omniafrigo.com.br/blog' },
    ]);
    assert.equal(deduped.length, 2);
  });
});

describe('buildStaticSitemapEntries', () => {
  it('sempre inclui rotas institucionais absolutas', () => {
    const entries = buildStaticSitemapEntries('https://omniafrigo.com.br');
    const urls = entries.map((e) => e.url);
    assert.ok(urls.includes('https://omniafrigo.com.br'));
    assert.ok(urls.includes('https://omniafrigo.com.br/sobre'));
    assert.ok(urls.includes('https://omniafrigo.com.br/blog'));
    assert.ok(urls.includes('https://omniafrigo.com.br/interesse'));
    assert.ok(urls.every((u) => u.startsWith('https://')));
  });
});

describe('buildSitemapEntries', () => {
  it('CMS disponível com conteúdo', () => {
    const entries = buildSitemapEntries({
      origin: 'https://omniafrigo.com.br',
      pages: [{ slug: 'sobre', pathname: '/sobre', noIndex: false }],
      companies: [{ portalSlug: 'renovacao' }],
      posts: [{ slug: 'bem-vindo-ao-blog-omnia', publishedAt: '2026-07-17T12:00:00.000Z' }],
      categories: [{ slug: 'institucional' }],
      tags: [{ slug: 'omnia' }],
    });
    const urls = entries.map((e) => e.url);
    assert.ok(urls.includes('https://omniafrigo.com.br/empresas/renovacao'));
    assert.ok(urls.includes('https://omniafrigo.com.br/blog/bem-vindo-ao-blog-omnia'));
    assert.ok(urls.includes('https://omniafrigo.com.br/blog/categoria/institucional'));
    assert.ok(urls.includes('https://omniafrigo.com.br/blog/tag/omnia'));
  });

  it('CMS vazio ainda retorna estáticos', () => {
    const entries = buildSitemapEntries({
      origin: 'https://omniafrigo.com.br',
      pages: [],
      companies: [],
      posts: [],
      categories: [],
      tags: [],
    });
    assert.ok(entries.length >= 4);
    assert.ok(entries.every((e) => e.url.startsWith('https://')));
  });

  it('staticOnly = fallback CMS indisponível', () => {
    const entries = buildSitemapEntries({
      origin: 'https://omniafrigo.com.br',
      staticOnly: true,
      posts: [{ slug: 'should-not-appear', publishedAt: '2026-07-17T12:00:00.000Z' }],
    });
    assert.ok(!entries.some((e) => e.url.includes('should-not-appear')));
    assert.ok(entries.some((e) => e.url.endsWith('/blog')));
  });

  it('exclui noIndex e slug inválido', () => {
    const entries = buildSitemapEntries({
      origin: 'https://omniafrigo.com.br',
      pages: [
        { slug: 'secreto', pathname: '/secreto', noIndex: true },
        { slug: 'Bad Slug', pathname: '/bad' },
      ],
      companies: [{ portalSlug: '' }, { portalSlug: '!!!' }],
      posts: [{ slug: '' }, { slug: 'ok-post', publishedAt: 'not-a-date' }],
    });
    const urls = entries.map((e) => e.url);
    assert.ok(!urls.some((u) => u.includes('secreto')));
    assert.ok(urls.includes('https://omniafrigo.com.br/blog/ok-post'));
    const post = entries.find((e) => e.url.endsWith('/blog/ok-post'));
    assert.equal(post?.lastModified, undefined);
  });

  it('deduplica URLs geradas', () => {
    const entries = buildSitemapEntries({
      origin: 'https://omniafrigo.com.br',
      pages: [
        { slug: 'sobre', pathname: '/sobre' },
        { slug: 'sobre', pathname: '/sobre' },
      ],
    });
    const sobre = entries.filter((e) => e.url.endsWith('/sobre'));
    assert.equal(sobre.length, 1);
  });

  it('nunca lança', () => {
    assert.doesNotThrow(() =>
      buildSitemapEntries({
        origin: '',
        posts: [{ slug: null as unknown as string, publishedAt: { bad: true } as unknown as string }],
      }),
    );
  });
});
