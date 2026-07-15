/* eslint-disable no-console -- test harness output */
import assert from 'node:assert/strict';

import { holdingCompaniesSeed } from '../seed/holding-companies';

let passed = 0;

const test = (name: string, fn: () => void): void => {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

const bySlug = new Map(holdingCompaniesSeed.map((company) => [company.slug, company]));

test('slugs do catálogo são únicos', () => {
  const slugs = holdingCompaniesSeed.map((company) => company.slug);
  assert.equal(slugs.length, new Set(slugs).size);
});

test('holding oficial permanece no seed', () => {
  assert.ok(bySlug.has('omnia-frigo-holding'));
});

test('fred-do-frio-academy → Engenharia', () => {
  const fred = bySlug.get('fred-do-frio-academy');
  assert.ok(fred);
  assert.equal(fred.ecosystemRole, 'Engenharia');
});

test('cte → Educação', () => {
  const cte = bySlug.get('cte');
  assert.ok(cte);
  assert.equal(cte.ecosystemRole, 'Educação');
});

console.log(`\n${passed} testes passaram.`);
