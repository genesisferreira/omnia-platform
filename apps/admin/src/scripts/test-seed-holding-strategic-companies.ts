/* eslint-disable no-console -- test harness output */
import assert from 'node:assert/strict';

import { strategicCompaniesSeed } from '../seed/holding-strategic-companies';
import {
  formatHoldingStrategicCompaniesLog,
  runHoldingStrategicCompaniesSeed,
  type StrategicCompaniesPayload,
} from '../seed/run-holding-strategic-companies';

let passed = 0;
const test = async (name: string, fn: () => void | Promise<void>): Promise<void> => {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

await test('seed define as empresas estratégicas com papéis corretos', () => {
  assert.deepEqual(
    strategicCompaniesSeed.map((item) => item.portalSlug),
    ['renovacao', 'fred-do-frio', 'cte', 'neurofrigo', 'neurofrigo-carga'],
  );
  const fred = strategicCompaniesSeed.find((item) => item.portalSlug === 'fred-do-frio');
  const cte = strategicCompaniesSeed.find((item) => item.portalSlug === 'cte');
  const carga = strategicCompaniesSeed.find((item) => item.portalSlug === 'neurofrigo-carga');
  assert.equal(fred?.ecosystemRole, 'Educação');
  assert.equal(cte?.ecosystemRole, 'Formação Técnica');
  assert.equal(fred?.brandTheme, 'fred');
  assert.equal(cte?.brandTheme, 'cte');
  assert.equal(carga?.ecosystemRole, 'Produto');
  assert.equal(carga?.applicationUrl, null);
});

await test('runner cria ausentes e atualiza existentes', async () => {
  const updated: string[] = [];
  const created: string[] = [];
  const payload: StrategicCompaniesPayload = {
    find: async (args) => {
      const where = args.where as { slug?: { equals?: string } };
      const slug = where.slug?.equals;
      if (slug === 'renovacao-refrigeracao') {
        return { docs: [{ id: 10, slug }] };
      }
      if (slug === 'omnia-frigo-holding') {
        return { docs: [{ id: 1, slug }] };
      }
      if (slug === 'centro-educacional-sapientia') {
        return { docs: [{ id: 6, slug }] };
      }
      return { docs: [] };
    },
    create: async (args) => {
      created.push(String(args.data.portalSlug));
      return { id: created.length + 100 };
    },
    update: async (args) => {
      updated.push(String(args.id));
      return { id: args.id };
    },
  };

  const outcome = await runHoldingStrategicCompaniesSeed(payload);
  assert.ok(
    outcome.items.some((item) => item.portalSlug === 'renovacao' && item.status === 'upgraded'),
  );
  assert.ok(
    outcome.items.some((item) => item.portalSlug === 'fred-do-frio' && item.status === 'created'),
  );
  assert.ok(created.includes('fred-do-frio'));
  assert.ok(updated.includes('10'));
  assert.match(formatHoldingStrategicCompaniesLog(outcome), /renovacao:upgraded/);
});

console.log(`\n${passed} testes passaram.`);
