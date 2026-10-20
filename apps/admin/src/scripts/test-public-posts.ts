/* eslint-disable no-console -- test harness */
import assert from 'node:assert/strict';

import { buildPublicPostsWhere, isPostPubliclyVisible } from '../endpoints/public-posts';
import {
  validatePublicPostDetailQuery,
  validatePublicPostsListQuery,
  validatePublicPostTaxonomyQuery,
} from '../endpoints/public-posts-query';

let passed = 0;

const test = (name: string, fn: () => void): void => {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

test('validatePublicPostsListQuery aceita site e paginação', () => {
  const query = validatePublicPostsListQuery(
    new URLSearchParams('site=omnia-hub&page=2&pageSize=10&q=refrigeracao'),
  );
  assert.equal(query.ok, true);
  if (query.ok) {
    assert.equal(query.site, 'omnia-hub');
    assert.equal(query.page, 2);
    assert.equal(query.q, 'refrigeracao');
  }
});

test('validatePublicPostsListQuery rejeita pageSize acima do limite', () => {
  const query = validatePublicPostsListQuery(new URLSearchParams('site=omnia-hub&pageSize=99'));
  assert.equal(query.ok, false);
});

test('validatePublicPostDetailQuery exige site e slug', () => {
  assert.equal(validatePublicPostDetailQuery(new URLSearchParams('site=omnia-hub')).ok, false);
  const ok = validatePublicPostDetailQuery(
    new URLSearchParams('site=omnia-hub&slug=primeiro-post'),
  );
  assert.equal(ok.ok, true);
});

test('validatePublicPostTaxonomyQuery rejeita params extras', () => {
  assert.equal(
    validatePublicPostTaxonomyQuery(new URLSearchParams('site=omnia-hub&extra=1')).ok,
    false,
  );
});

test('buildPublicPostsWhere inclui status published', () => {
  const where = buildPublicPostsWhere({ siteId: 1 });
  assert.ok(where.and);
});

test('isPostPubliclyVisible respeita publishAt futuro', () => {
  const now = new Date('2026-07-17T12:00:00.000Z');
  assert.equal(
    isPostPubliclyVisible(
      {
        _status: 'published',
        publishAt: '2026-07-18T12:00:00.000Z',
      },
      now,
    ),
    false,
  );
  assert.equal(
    isPostPubliclyVisible(
      {
        _status: 'published',
        publishAt: '2026-07-16T12:00:00.000Z',
      },
      now,
    ),
    true,
  );
  assert.equal(isPostPubliclyVisible({ _status: 'draft' }, now), false);
});

console.log(`\n${passed} testes passaram.`);
