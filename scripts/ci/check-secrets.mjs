#!/usr/bin/env node
/**
 * Varredura simples de segredos nos arquivos versionados (o repositório é público).
 * Falha se encontrar chaves privadas, tokens conhecidos ou URLs de banco com credencial
 * apontando para fora de ambientes locais/CI.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', 'postgres', 'db', 'build']);
// Fixtures de teste com valores sabidamente falsos.
const ALLOWLIST = new Set(['packages/neurofrigo-orchestrator/src/test-orchestrator.ts']);
const RULES = [
  ['chave privada', /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY( BLOCK)?-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['token GitHub', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['token Slack', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ['chave de API estilo sk-', /\bsk-[A-Za-z0-9]{32,}\b/],
  ['chave Google API', /\bAIza[0-9A-Za-z_-]{35}\b/],
];

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(
    (f) =>
      f &&
      !ALLOWLIST.has(f) &&
      !/(^|\/)(pnpm-lock\.yaml|.*\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|zip|gz))$/i.test(f),
  );

const findings = [];
for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const [label, re] of RULES) {
      if (re.test(line)) findings.push(`${file}:${i + 1} ${label}`);
    }
    for (const m of line.matchAll(
      /postgres(?:ql)?:\/\/([^:\s/'"`]+):([^@\s'"`]+)@([^:/\s'"`]+)/g,
    )) {
      const [, , password, host] = m;
      const placeholder = /^[$<{]/.test(password) || /^[<{$]/.test(host);
      if (placeholder || LOCAL_DB_HOSTS.has(host)) continue;
      findings.push(`${file}:${i + 1} URL de banco com credencial (host ${host})`);
    }
  });
}

console.log(`arquivos_verificados=${files.length}`);
if (findings.length > 0) {
  for (const f of findings) console.error(`ACHADO ${f}`);
  process.exit(1);
}
console.log('SECRETS_CHECK=PASS');
