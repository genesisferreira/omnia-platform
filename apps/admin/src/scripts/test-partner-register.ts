import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PARTNER_REGISTER_BLOCKED_KEYS,
  formatRetryAfterMinutes,
  validatePartnerRegisterBody,
} from '../lib/partner-register';

describe('partner register mass assignment', () => {
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
  it('formats minutes from seconds', () => {
    assert.equal(formatRetryAfterMinutes(30), '1 minuto');
    assert.equal(formatRetryAfterMinutes(120), '2 minutos');
    assert.equal(formatRetryAfterMinutes(undefined).includes('minuto'), true);
  });
});

// eslint-disable-next-line no-console -- saída de script de teste
console.log('testes partner-register ok');
