import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PARTNER_REGISTER_BLOCKED_KEYS,
  escapeHtml,
  formatRetryAfterMinutes,
  isReservedEmailDomain,
  validatePartnerRegisterBody,
} from '../lib/partner-register';

const validBase = {
  companyName: 'Fria Tech LTDA',
  tradeName: 'Fria Tech',
  partnerType: 'company',
  document: '52998224725',
  email: 'contato@friatech.example',
  city: 'Campinas',
  state: 'SP',
  privacyAccepted: true,
  analysisAuthorized: true,
  truthfulnessConfirmed: true,
  status: 'approved',
  featured: true,
  verified: true,
  plan: 'enterprise',
  approvalNotes: 'hack',
  approvedBy: 1,
  publishedAt: '2026-01-01',
  ownerUser: 2,
  active: true,
  latitude: -23.5,
  longitude: -46.6,
};

describe('partner register mass assignment', () => {
  it('does not apply admin fields from body', () => {
    const result = validatePartnerRegisterBody(validBase);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const data = result.data as Record<string, unknown>;
    for (const key of PARTNER_REGISTER_BLOCKED_KEYS) {
      assert.equal(key in data, false, `blocked key present: ${key}`);
    }
  });

  it('requires consents', () => {
    const result = validatePartnerRegisterBody({
      ...validBase,
      privacyAccepted: false,
    });
    assert.equal(result.ok, false);
  });

  it('rejects invalid document', () => {
    const result = validatePartnerRegisterBody({
      ...validBase,
      document: '111',
    });
    assert.equal(result.ok, false);
  });

  it('strips client coordinates', () => {
    const result = validatePartnerRegisterBody(validBase);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal('latitude' in result.data, false);
    assert.equal('longitude' in result.data, false);
  });
});

describe('retry after messaging', () => {
  it('marketplace intent requires the responsible person name', () => {
    const missing = validatePartnerRegisterBody({ ...validBase, marketplaceIntent: 'products' });
    assert.equal(missing.ok, false);
    const ok = validatePartnerRegisterBody({
      ...validBase,
      marketplaceIntent: 'both',
      contactName: 'Responsável Teste',
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.data.marketplaceIntent, 'both');
      assert.equal(ok.data.contactName, 'Responsável Teste');
    }
    const unknown = validatePartnerRegisterBody({ ...validBase, marketplaceIntent: 'owner' });
    assert.equal(unknown.ok && unknown.data.marketplaceIntent, 'none');
  });

  it('never sends real e-mail to reserved domains and escapes HTML', () => {
    assert.equal(isReservedEmailDomain('a@example.invalid'), true);
    assert.equal(isReservedEmailDomain('a@empresa.example.com'), true);
    assert.equal(isReservedEmailDomain('a@x.test'), true);
    assert.equal(isReservedEmailDomain('contato@omniafrigo.com.br'), false);
    assert.equal(escapeHtml('<img src=x onerror=1>&'), '&lt;img src=x onerror=1&gt;&amp;');
  });

  it('formats minutes from seconds', () => {
    assert.equal(formatRetryAfterMinutes(30), '1 minuto');
    assert.equal(formatRetryAfterMinutes(120), '2 minutos');
    assert.equal(formatRetryAfterMinutes(undefined).includes('minuto'), true);
  });
});

// eslint-disable-next-line no-console -- saída de script de teste
console.log('testes partner-register ok');
