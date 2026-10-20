#!/usr/bin/env node
/**
 * Guarda de migrations do Admin (Payload):
 * 1. Todo arquivo de migration está registrado em migrations/index.ts e vice-versa.
 * 2. Migrations posteriores à última aplicada em produção (MIGRATIONS_BASELINE) não podem conter
 *    operações destrutivas no `up` sem a marcação explícita `ci-allow-destructive`.
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('apps/admin/src/migrations');
const baseline = process.env.MIGRATIONS_BASELINE ?? '20261019_180000_marketplace_invites_revisions';
const DESTRUCTIVE =
  /\b(DROP\s+TABLE|DROP\s+COLUMN|DROP\s+SCHEMA|TRUNCATE|DELETE\s+FROM|ALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE)\b/i;

const files = fs
  .readdirSync(dir)
  .filter((f) => /^\d{8}_\d{6}(_.+)?\.ts$/.test(f))
  .map((f) => f.replace(/\.ts$/, ''))
  .sort();
const index = fs.readFileSync(path.join(dir, 'index.ts'), 'utf8');
const errors = [];

for (const name of files) {
  if (!index.includes(`'./${name}'`) && !index.includes(`"./${name}"`)) {
    errors.push(`não registrada em index.ts: ${name}`);
  }
}
for (const m of index.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)) {
  if (!files.includes(m[1])) errors.push(`index.ts importa arquivo inexistente: ${m[1]}`);
}

const newer = files.filter((name) => name > baseline);
for (const name of newer) {
  const source = fs.readFileSync(path.join(dir, `${name}.ts`), 'utf8');
  const downAt = source.search(/export\s+async\s+function\s+down/);
  const up = downAt === -1 ? source : source.slice(0, downAt);
  up.split('\n').forEach((line, i) => {
    if (DESTRUCTIVE.test(line) && !line.includes('ci-allow-destructive')) {
      errors.push(`${name}.ts:${i + 1} operação destrutiva no up: ${line.trim().slice(0, 120)}`);
    }
  });
}

console.log(`migrations=${files.length} baseline=${baseline} novas_desde_baseline=${newer.length}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`ERRO ${e}`);
  process.exit(1);
}
console.log('MIGRATIONS_CHECK=PASS');
