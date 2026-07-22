/**
 * Testes — construção resiliente do RSS (Release 2.1.1).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRssXml,
  escapeXml,
  RSS_CONTENT_TYPE,
  sortPostsByDateDesc,
  toAbsoluteFeedUrl,
} from '../lib/seo/rss-feed';

describe('escapeXml', () => {
  it('escapa caracteres especiais', () => {
    assert.equal(escapeXml(`A & B <C> "D" 'E'`), 'A &amp; B &lt;C&gt; &quot;D&quot; &apos;E&apos;');
  });
});

describe('sortPostsByDateDesc', () => {
  it('ordena por data decrescente e empurra inválidos ao fim', () => {
    const sorted = sortPostsByDateDesc([
      { title: 'Old', slug: 'old', publishedAt: '2026-01-01T00:00:00.000Z' },
      { title: 'New', slug: 'new', publishedAt: '2026-07-01T00:00:00.000Z' },
      { title: 'Bad', slug: 'bad', publishedAt: 'nope' },
    ]);
    assert.equal(sorted[0]?.slug, 'new');
    assert.equal(sorted[1]?.slug, 'old');
    assert.equal(sorted[2]?.slug, 'bad');
  });
});

describe('buildRssXml', () => {
  it('feed com posts válidos', () => {
    const xml = buildRssXml({
      origin: 'https://omniafrigo.com.br',
      posts: [
        {
          title: 'Bem-vindo',
          slug: 'bem-vindo',
          excerpt: 'Resumo',
          publishedAt: '2026-07-17T12:00:00.000Z',
          authorName: 'Equipe',
          categoryName: 'Institucional',
          imageUrl: 'https://omniafrigo.com.br/og-default.png',
        },
      ],
    });
    assert.match(xml, /^<\?xml version="1.0"/);
    assert.match(xml, /<rss version="2.0">/);
    assert.match(xml, /<item>/);
    assert.match(xml, /<title>Bem-vindo<\/title>/);
    assert.match(xml, /https:\/\/omniafrigo\.com\.br\/blog\/bem-vindo/);
    assert.match(xml, /<author>Equipe<\/author>/);
    assert.match(xml, /<category>Institucional<\/category>/);
  });

  it('feed vazio mantém canal institucional', () => {
    const xml = buildRssXml({ origin: 'https://omniafrigo.com.br', posts: [] });
    assert.match(xml, /<channel>/);
    assert.match(xml, /Omnia Frigo Holding/);
    assert.doesNotMatch(xml, /<item>/);
  });

  it('escapa título e resumo com caracteres especiais', () => {
    const xml = buildRssXml({
      origin: 'https://omniafrigo.com.br',
      posts: [{ title: 'A & B <test>', slug: 'a-b', excerpt: 'C > D & "E"' }],
    });
    assert.match(xml, /A &amp; B &lt;test&gt;/);
    assert.match(xml, /C &gt; D &amp; &quot;E&quot;/);
  });

  it('tolera campos opcionais e data inválida', () => {
    const xml = buildRssXml({
      origin: 'https://omniafrigo.com.br',
      posts: [
        {
          title: 'Sem extras',
          slug: 'sem-extras',
          excerpt: null,
          publishedAt: 'invalid-date',
          authorName: null,
          imageUrl: null,
          categoryName: null,
        },
      ],
    });
    assert.match(xml, /<item>/);
    assert.doesNotMatch(xml, /<pubDate>/);
    assert.doesNotMatch(xml, /<author>/);
  });

  it('omite slug inválido', () => {
    const xml = buildRssXml({
      origin: 'https://omniafrigo.com.br',
      posts: [{ title: 'X', slug: 'Bad Slug' }],
    });
    assert.doesNotMatch(xml, /<item>/);
  });

  it('usa URLs absolutas', () => {
    assert.equal(toAbsoluteFeedUrl('https://omniafrigo.com.br/', '/blog'), 'https://omniafrigo.com.br/blog');
    const xml = buildRssXml({
      origin: 'https://omniafrigo.com.br',
      posts: [{ title: 'P', slug: 'p' }],
    });
    assert.match(xml, /https:\/\/omniafrigo\.com\.br\/blog\/p/);
  });

  it('nunca lança e Content-Type constante é válido', () => {
    assert.equal(RSS_CONTENT_TYPE, 'application/rss+xml; charset=utf-8');
    assert.doesNotThrow(() =>
      buildRssXml({
        origin: '',
        posts: [{ title: null as unknown as string, slug: 1 as unknown as string }],
      }),
    );
  });

  it('fallback do endpoint permanece HTTP 200 com XML e Content-Type', async () => {
    const xml = buildRssXml({ origin: 'https://omniafrigo.com.br', posts: [] });
    const response = new Response(xml, {
      status: 200,
      headers: { 'Content-Type': RSS_CONTENT_TYPE },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), RSS_CONTENT_TYPE);
    const body = await response.text();
    assert.match(body, /<rss version="2.0">/);
    assert.doesNotMatch(body, /stack|Error:/i);
  });
});
