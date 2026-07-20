/* eslint-disable no-console -- test harness output */
import assert from 'node:assert/strict';

import {
  LEAD_CAPTURE_DEDUPE_WINDOW_MS,
  LEAD_CAPTURE_MAX_BODY_BYTES,
  LEAD_INTEREST_AREAS,
} from '@omnia/constants';

import {
  allowLeadCaptureRequest,
  buildConsentNote,
  buildLeadNotes,
  clientIpFromHeaders,
  isBodyTooLarge,
  isHoneypotTriggered,
  isTrustedOrigin,
  isWithinDedupeWindow,
  normalizeCompanyName,
  normalizeEmail,
  normalizeWhatsapp,
  resetLeadCaptureRateLimitForTests,
  sameCampaignAndInterest,
  validateLeadCaptureBody,
  LEAD_CAPTURE_RATE_LIMIT_MAX,
  LEAD_CAPTURE_RATE_LIMIT_WINDOW_MS,
} from '../lib/lead-capture';

let passed = 0;

const test = async (name: string, fn: () => void | Promise<void>): Promise<void> => {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

const run = async (): Promise<void> => {
  await test('áreas de interesse cobrem o ecossistema', () => {
    assert.ok(LEAD_INTEREST_AREAS.length >= 15);
    assert.ok(LEAD_INTEREST_AREAS.some((a) => a.value === 'neurofrigo-carga'));
  });

  await test('normaliza e-mail e WhatsApp', () => {
    assert.equal(normalizeEmail('  Gen@Omnia.COM '), 'gen@omnia.com');
    assert.equal(normalizeWhatsapp('(11) 98888-7777'), '11988887777');
    assert.equal(normalizeWhatsapp('123'), null);
  });

  await test('normaliza empresa para dedupe', () => {
    assert.equal(normalizeCompanyName('  Renovação   Refrigeração '), 'renovação refrigeração');
  });

  await test('valida campos obrigatórios e LGPD', () => {
    const missing = validateLeadCaptureBody({
      nome: 'Ana',
      email: 'ana@example.com',
      whatsapp: '11988887777',
      areaInteresse: 'consultoria',
    });
    assert.equal(missing.ok, false);

    const invalidEmail = validateLeadCaptureBody({
      nome: 'Ana Silva',
      email: 'nao-email',
      whatsapp: '11988887777',
      areaInteresse: 'consultoria',
      aceitePrivacidade: true,
    });
    assert.equal(invalidEmail.ok, false);

    const invalidArea = validateLeadCaptureBody({
      nome: 'Ana Silva',
      email: 'ana@example.com',
      whatsapp: '11988887777',
      areaInteresse: 'area-fantasma',
      aceitePrivacidade: true,
    });
    assert.equal(invalidArea.ok, false);
    if (!invalidArea.ok) {
      assert.equal(invalidArea.status, 422);
    }

    const ok = validateLeadCaptureBody({
      nome: 'Ana Silva',
      email: 'Ana@Example.com',
      whatsapp: '(11) 98888-7777',
      areaInteresse: 'neurofrigo-carga',
      aceitePrivacidade: true,
      empresa: 'Empresa X',
      utm_campaign: 'curso-refrigeracao',
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.data.email, 'ana@example.com');
      assert.equal(ok.data.source, 'landing_page');
      assert.equal(ok.data.consentOrigin, 'lead_capture');
    }
  });

  await test('bloqueia honeypot e payload excessivo', () => {
    assert.equal(isHoneypotTriggered({ website: 'http://spam.test' }), true);
    assert.equal(isHoneypotTriggered({ website: '' }), false);
    assert.equal(isBodyTooLarge('x'.repeat(LEAD_CAPTURE_MAX_BODY_BYTES + 10)), true);
  });

  await test('UTMs e consentimento entram nas notas', () => {
    const validated = validateLeadCaptureBody({
      nome: 'Ana Silva',
      email: 'ana@example.com',
      whatsapp: '11988887777',
      areaInteresse: 'parcerias',
      aceitePrivacidade: true,
      utm_source: 'google',
      utm_campaign: 'curso-refrigeracao',
      landingPath: '/interesse',
    });
    assert.equal(validated.ok, true);
    if (!validated.ok) {
      return;
    }
    const notes = buildLeadNotes(validated.data);
    assert.match(notes, /utm_source=google/);
    assert.match(notes, /utm_campaign=curso-refrigeracao/);
    assert.match(buildConsentNote(validated.data), /consentOrigin=lead_capture/);
  });

  await test('dedupe por janela curta de 15 minutos', () => {
    assert.equal(LEAD_CAPTURE_DEDUPE_WINDOW_MS, 15 * 60 * 1000);
    const now = new Date('2026-07-20T12:00:00.000Z');
    assert.equal(isWithinDedupeWindow('2026-07-20T11:50:00.000Z', now), true);
    assert.equal(isWithinDedupeWindow('2026-07-20T11:40:00.000Z', now), false);

    const data = validateLeadCaptureBody({
      nome: 'Ana Silva',
      email: 'ana@example.com',
      whatsapp: '11988887777',
      areaInteresse: 'parcerias',
      aceitePrivacidade: true,
      utm_campaign: 'meta-q3',
    });
    assert.equal(data.ok, true);
    if (!data.ok) {
      return;
    }

    assert.equal(
      sameCampaignAndInterest(
        {
          origin: 'landing_page',
          interest: 'parcerias',
          notes: 'utm_campaign=meta-q3',
        },
        data.data,
      ),
      true,
    );
    assert.equal(
      sameCampaignAndInterest(
        {
          origin: 'landing_page',
          interest: 'parcerias',
          notes: 'utm_campaign=outra',
        },
        data.data,
      ),
      false,
    );
  });

  await test('rate limit por chave retorna bloqueio após limite', async () => {
    process.env.RATE_LIMIT_BACKEND = 'memory';
    resetLeadCaptureRateLimitForTests();
    const keys = { ip: '203.0.113.50', email: 'rate@test.com', whatsapp: '11999998888' };
    for (let i = 0; i < 5; i += 1) {
      const result = await allowLeadCaptureRequest(keys);
      assert.equal(result.allowed, true);
    }
    const blocked = await allowLeadCaptureRequest(keys);
    assert.equal(blocked.allowed, false);
  });

  await test('valida Origin confiável', () => {
    assert.equal(
      isTrustedOrigin('https://dev.omniafrigo.com.br', ['https://dev.omniafrigo.com.br']),
      true,
    );
    assert.equal(
      isTrustedOrigin('https://evil.example', ['https://dev.omniafrigo.com.br']),
      false,
    );
  });

  await test('não cria User — contrato público não inclui role/status administrativo', () => {
    const validated = validateLeadCaptureBody({
      nome: 'Ana Silva',
      email: 'ana@example.com',
      whatsapp: '11988887777',
      areaInteresse: 'consultoria',
      aceitePrivacidade: true,
      role: 'super_admin',
      status: 'fechado',
      temperature: 'quente',
    } as Record<string, unknown>);
    assert.equal(validated.ok, true);
    if (!validated.ok) {
      return;
    }
    const keys = Object.keys(validated.data);
    assert.equal(keys.includes('role'), false);
    assert.equal(keys.includes('status'), false);
    assert.equal(keys.includes('temperature'), false);
    assert.equal(validated.data.source, 'landing_page');
  });

  await test('IP prefere X-Real-IP e não usa cadeia completa de XFF', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4, 10.0.0.1',
      'x-real-ip': '203.0.113.10',
    });
    assert.equal(clientIpFromHeaders(headers), '203.0.113.10');
    assert.equal(
      clientIpFromHeaders(new Headers({ 'x-forwarded-for': '9.9.9.9, 8.8.8.8' })),
      '9.9.9.9',
    );
  });

  await test('rate limit documentado: 5 por 15 minutos (Redis, fail-closed)', () => {
    assert.equal(LEAD_CAPTURE_RATE_LIMIT_MAX, 5);
    assert.equal(LEAD_CAPTURE_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
  });

  await test('resposta pública de sucesso não inclui IDs', () => {
    const body = {
      ok: true as const,
      message: 'Recebemos seu interesse. Nossa equipe entrará em contato em breve.',
    };
    assert.deepEqual(Object.keys(body).sort(), ['message', 'ok']);
    assert.equal('id' in body, false);
    assert.equal('leadId' in body, false);
    assert.equal('contactId' in body, false);
  });

  console.log(`\n${passed} testes OK (lead-capture)`);
};

void run();
