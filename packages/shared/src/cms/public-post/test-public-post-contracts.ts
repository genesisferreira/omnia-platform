/* eslint-disable no-console -- test harness */
import assert from 'node:assert/strict';

import { mapPublicPost, mapPublicPostListItem, mapPublicRichText } from './map';

let passed = 0;

const test = (name: string, fn: () => void): void => {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

test('mapPublicRichText extrai heading e parágrafo', () => {
  const nodes = mapPublicRichText({
    root: {
      children: [
        {
          type: 'heading',
          tag: 'h2',
          children: [{ type: 'text', text: 'Título', format: 1 }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Corpo do artigo.' }],
        },
      ],
    },
  });

  assert.equal(nodes.length, 2);
  assert.equal(nodes[0]?.type, 'heading');
  assert.equal(nodes[1]?.type, 'paragraph');
});

test('mapPublicPostListItem rejeita documento incompleto', () => {
  assert.equal(mapPublicPostListItem({ title: 'Sem slug' }), null);
});

test('mapPublicPost monta DTO allowlist', () => {
  const post = mapPublicPost({
    id: 1,
    site: { id: 10, slug: 'omnia-hub' },
    title: 'Primeiro post',
    slug: 'primeiro-post',
    excerpt: 'Resumo',
    type: 'blog',
    publishedAt: '2026-07-17T12:00:00.000Z',
    content: {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Um dois três quatro cinco' }],
          },
        ],
      },
    },
    author: { id: 2, name: 'Equipe Omnia', slug: 'equipe-omnia' },
    categories: [{ id: 3, name: 'Institucional', slug: 'institucional' }],
    tags: [{ id: 4, name: 'Holding', slug: 'holding' }],
    relatedPosts: [],
    seo: {
      metaTitle: 'Primeiro post | Blog',
      noIndex: false,
    },
    updatedAt: '2026-07-17T13:00:00.000Z',
  });

  assert.ok(post);
  assert.equal(post.slug, 'primeiro-post');
  assert.equal(post.readingTimeMinutes, 1);
  assert.equal(post.categories[0]?.slug, 'institucional');
  assert.equal(post.seo.metaTitle, 'Primeiro post | Blog');
});

console.log(`\n${passed} testes passaram.`);
