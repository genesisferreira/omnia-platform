/**
 * Testes unitários da camada SEO do Portal (sem Next runtime).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPageMetadata } from '../lib/seo/build-page-metadata';
import { resolvePublicImageAlt } from '../lib/seo/image-alt';
import {
  buildOrganizationJsonLd,
  buildWebPageJsonLd,
  buildWebSiteJsonLd,
} from '../lib/seo/json-ld';
import { resolveCanonicalUrl } from '../lib/seo/site-url';

describe('resolvePublicImageAlt', () => {
  it('prioriza alt editorial', () => {
    assert.equal(resolvePublicImageAlt(' Logo Omnia ', 'Empresa'), 'Logo Omnia');
  });

  it('usa fallback quando alt está vazio', () => {
    assert.equal(resolvePublicImageAlt('   ', 'Renovação Refrigeração'), 'Renovação Refrigeração');
    assert.equal(resolvePublicImageAlt(null, 'CTE'), 'CTE');
  });
});

describe('resolveCanonicalUrl', () => {
  it('prioriza canonical editorial', () => {
    assert.equal(
      resolveCanonicalUrl({
        pathname: '/sobre',
        editorialCanonical: 'https://dev.omniafrigo.com.br/sobre',
        hostname: 'localhost',
      }),
      'https://dev.omniafrigo.com.br/sobre',
    );
  });

  it('gera canonical a partir do hostname', () => {
    assert.equal(
      resolveCanonicalUrl({
        pathname: '/empresas',
        hostname: 'dev.omniafrigo.com.br',
      }),
      'https://dev.omniafrigo.com.br/empresas',
    );
  });
});

describe('buildPageMetadata', () => {
  it('monta OpenGraph, Twitter, canonical e robots', () => {
    const metadata = buildPageMetadata({
      pathname: '/sobre',
      title: 'Sobre a Omnia Frigo Holding',
      seo: {
        metaTitle: 'Sobre | Omnia Frigo Holding',
        metaDescription: 'Conheça a Holding.',
        canonicalUrl: null,
        noIndex: false,
      },
      hostname: 'dev.omniafrigo.com.br',
    });

    assert.equal(metadata.title, 'Sobre | Omnia Frigo Holding');
    assert.equal(metadata.description, 'Conheça a Holding.');
    assert.deepEqual(metadata.alternates, {
      canonical: 'https://dev.omniafrigo.com.br/sobre',
    });
    assert.deepEqual(metadata.robots, { index: true, follow: true });
    assert.equal(metadata.openGraph?.title, 'Sobre | Omnia Frigo Holding');
    assert.equal(metadata.openGraph?.url, 'https://dev.omniafrigo.com.br/sobre');
    assert.ok(metadata.openGraph?.images);
    const ogImages = metadata.openGraph.images;
    const firstOgImage = Array.isArray(ogImages) ? ogImages[0] : ogImages;
    assert.equal(
      typeof firstOgImage === 'object' && firstOgImage && 'url' in firstOgImage
        ? firstOgImage.url
        : firstOgImage,
      '/og-default.png',
    );
    assert.ok(metadata.twitter);
    assert.equal(
      'card' in metadata.twitter ? metadata.twitter.card : undefined,
      'summary_large_image',
    );
    assert.deepEqual('images' in metadata.twitter ? metadata.twitter.images : undefined, [
      '/og-default.png',
    ]);
  });

  it('metadata de 404 é noindex', async () => {
    const { buildNotFoundMetadata } = await import('../lib/seo/build-page-metadata');
    const metadata = buildNotFoundMetadata();
    assert.deepEqual(metadata.robots, { index: false, follow: false });
    assert.match(String(metadata.title), /não encontrada/i);
  });

  it('respeita noIndex editorial', () => {
    const metadata = buildPageMetadata({
      pathname: '/contato',
      seo: {
        metaTitle: null,
        metaDescription: null,
        canonicalUrl: null,
        noIndex: true,
      },
      hostname: 'dev.omniafrigo.com.br',
    });

    assert.deepEqual(metadata.robots, { index: false, follow: false });
  });
});

describe('json-ld', () => {
  it('gera Organization, WebSite e WebPage', () => {
    const organization = buildOrganizationJsonLd({ hostname: 'dev.omniafrigo.com.br' });
    const website = buildWebSiteJsonLd({ hostname: 'dev.omniafrigo.com.br' });
    const webpage = buildWebPageJsonLd({
      pathname: '/sobre',
      title: 'Sobre',
      hostname: 'dev.omniafrigo.com.br',
    });

    assert.equal(organization['@type'], 'Organization');
    assert.equal(website['@type'], 'WebSite');
    assert.equal(webpage['@type'], 'WebPage');
    assert.equal(webpage.url, 'https://dev.omniafrigo.com.br/sobre');
  });
});
