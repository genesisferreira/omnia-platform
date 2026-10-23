import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { PayloadRequest } from 'payload';

import { resetRateLimitMemoryForTests } from '@omnia/shared/rate-limit';

import { buildContactEmail, contactMessageEndpoint } from '../endpoints/contact-message';

process.env.RATE_LIMIT_BACKEND = 'memory';
process.env.NEXT_PUBLIC_APP_URL = 'https://omniafrigoholding.com.br';
process.env.NEXT_PUBLIC_ADMIN_URL = 'https://admin.omniafrigoholding.com.br';

const PORTAL = 'https://omniafrigoholding.com.br';

const valid = {
  nome: 'Maria Teste',
  email: 'maria.teste@exemplo.com.br',
  assunto: 'cursos-formacao',
  mensagem: 'Quero saber sobre os cursos técnicos <b>disponíveis</b>.',
};

type SentEmail = { to: string; replyTo: string; subject: string; text: string; html: string };

function makeReq(options: {
  body: unknown;
  origin?: string | null;
  ip?: string;
  sendEmail?: (email: SentEmail) => Promise<unknown>;
}) {
  const sent: SentEmail[] = [];
  const logs: unknown[] = [];
  const headers = new Headers({ 'x-forwarded-for': options.ip ?? '203.0.113.10' });
  if (options.origin !== null) headers.set('origin', options.origin ?? PORTAL);
  const log = (entry: unknown) => logs.push(entry);
  const req = {
    headers,
    json: async () => options.body,
    payload: {
      logger: { info: log, warn: log, error: log },
      sendEmail: async (email: SentEmail) => {
        sent.push(email);
        return options.sendEmail
          ? options.sendEmail(email)
          : { accepted: [email.to], rejected: [] };
      },
    },
  } as unknown as PayloadRequest;
  return { req, sent, logs };
}

async function call(req: PayloadRequest) {
  const response = await contactMessageEndpoint.handler(req);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe('POST /api/omnia/contact-message', () => {
  beforeEach(() => resetRateLimitMemoryForTests());

  it('envia para contato@ com replyTo do remetente', async () => {
    const { req, sent, logs } = makeReq({ body: valid });
    const result = await call(req);
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.to, 'contato@omniafrigoholding.com.br');
    assert.equal(sent[0]?.replyTo, 'maria.teste@exemplo.com.br');
    assert.match(sent[0]?.subject ?? '', /^\[Site\] Cursos e formação técnica — Maria Teste$/);
    assert.ok(!(sent[0]?.html ?? '').includes('<b>'), 'html escapado');
    const serializedLogs = JSON.stringify(logs);
    assert.ok(!serializedLogs.includes('maria'), 'logs sem dados pessoais');
  });

  it('rejeita origem ausente ou não confiável', async () => {
    for (const origin of [null, 'https://evil.example']) {
      const { req, sent } = makeReq({ body: valid, origin });
      const result = await call(req);
      assert.equal(result.status, 403);
      assert.equal(sent.length, 0);
    }
  });

  it('honeypot responde sucesso sem enviar', async () => {
    const { req, sent } = makeReq({ body: { ...valid, website: 'http://spam' } });
    const result = await call(req);
    assert.equal(result.status, 200);
    assert.equal(sent.length, 0);
  });

  it('valida campos obrigatórios e informa o campo', async () => {
    const { req, sent } = makeReq({ body: { ...valid, email: 'invalido' } });
    const result = await call(req);
    assert.equal(result.status, 422);
    assert.equal((result.body.error as { field?: string }).field, 'email');
    assert.equal(sent.length, 0);
  });

  it('não simula sucesso quando o SMTP falha ou recusa o destinatário', async () => {
    const failing = makeReq({
      body: valid,
      ip: '203.0.113.20',
      sendEmail: async () => {
        throw new Error('Connection timeout');
      },
    });
    assert.equal((await call(failing.req)).status, 503);

    const rejected = makeReq({
      body: { ...valid, email: 'outra@exemplo.com.br' },
      ip: '203.0.113.21',
      sendEmail: async (email) => ({ accepted: [], rejected: [email.to] }),
    });
    const result = await call(rejected.req);
    assert.equal(result.status, 503);
    assert.equal(result.body.ok, false);
  });

  it('limita envios repetidos (rate limit)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const { req } = makeReq({ body: valid, ip: '203.0.113.30' });
      statuses.push((await call(req)).status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
  });

  it('corpo do e-mail contém os dados do formulário', () => {
    const email = buildContactEmail({
      nome: 'Maria Teste',
      email: 'maria.teste@exemplo.com.br',
      assunto: 'outros',
      mensagem: 'Linha 1\nLinha 2',
    });
    assert.ok(email.text.includes('Assunto: Outros'));
    assert.ok(email.text.includes('Linha 1\nLinha 2'));
  });
});
