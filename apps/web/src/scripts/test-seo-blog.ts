/**
 * Testes unitários SEO do Blog (sem Next runtime).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractHeadings } from '../components/blog/LexicalContent';
import { buildPageMetadata } from '../lib/seo/build-page-metadata';
import { buildArticleJsonLd } from '../lib/seo/json-ld';
import type { PublicRichTextNode } from '@omnia/shared';

describe('buildArticleJsonLd', () => {
  it('gera BlogPosting com headline, author e datas', () => {
    const jsonLd = buildArticleJsonLd({
      pathname: '/blog/bem-vindo-ao-blog-omnia',
      headline: 'Bem-vindo ao Blog',
      description: 'Conheça o Blog da Holding.',
      datePublished: '2026-07-17T12:00:00.000Z',
      dateModified: '2026-07-17T13:00:00.000Z',
      authorName: 'Equipe Omnia',
      imageUrl: '/og-default.png',
      hostname: 'dev.omniafrigo.com.br',
    });

    assert.equal(jsonLd['@type'], 'BlogPosting');
    assert.equal(jsonLd.headline, 'Bem-vindo ao Blog');
    assert.equal(jsonLd.url, 'https://dev.omniafrigo.com.br/blog/bem-vindo-ao-blog-omnia');
    assert.deepEqual(jsonLd.author, { '@type': 'Person', name: 'Equipe Omnia' });
    assert.equal(jsonLd.datePublished, '2026-07-17T12:00:00.000Z');
    assert.deepEqual(jsonLd.image, ['/og-default.png']);
  });

  it('respeita schemaType Article', () => {
    const jsonLd = buildArticleJsonLd({
      pathname: '/blog/exemplo',
      headline: 'Exemplo',
      hostname: 'dev.omniafrigo.com.br',
      schemaType: 'Article',
    });
    assert.equal(jsonLd['@type'], 'Article');
  });
});

describe('blog metadata', () => {
  it('monta metadata de post com canonical', () => {
    const metadata = buildPageMetadata({
      pathname: '/blog/refrigeracao-eficiente-no-brasil',
      title: 'Refrigeração eficiente',
      seo: {
        metaTitle: 'Refrigeração eficiente | Omnia Frigo Holding',
        metaDescription: 'Eficiência energética em refrigeração.',
        canonicalUrl: null,
        noIndex: false,
      },
      hostname: 'dev.omniafrigo.com.br',
    });

    assert.equal(metadata.title, 'Refrigeração eficiente | Omnia Frigo Holding');
    assert.deepEqual(metadata.alternates, {
      canonical: 'https://dev.omniafrigo.com.br/blog/refrigeracao-eficiente-no-brasil',
    });
    assert.deepEqual(metadata.robots, { index: true, follow: true });
  });
});

describe('extractHeadings', () => {
  it('extrai ids estáveis de h2/h3', () => {
    const nodes: PublicRichTextNode[] = [
      {
        type: 'heading',
        tag: 'h2',
        children: [{ type: 'text', text: 'Um canal para o ecossistema' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Texto' }],
      },
      {
        type: 'heading',
        tag: 'h3',
        children: [{ type: 'text', text: 'Detalhe' }],
      },
    ];

    const headings = extractHeadings(nodes);
    assert.equal(headings.length, 2);
    assert.equal(headings[0]?.id, 'um-canal-para-o-ecossistema');
    assert.equal(headings[0]?.tag, 'h2');
    assert.equal(headings[1]?.tag, 'h3');
  });
});
