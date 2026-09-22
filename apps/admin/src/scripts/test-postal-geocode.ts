import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeBrazilianPostalCode } from '../lib/postal-code/provider';
import { partnerAddressChanged } from '../lib/partners/resolve-partner-location';
import {
  PARTNER_REGISTER_BLOCKED_KEYS,
  validatePartnerRegisterBody,
} from '../lib/partner-register';

describe('normalizeBrazilianPostalCode', () => {
  it('accepts masked and unmasked', () => {
    assert.equal(normalizeBrazilianPostalCode('30110-012'), '30110012');
    assert.equal(normalizeBrazilianPostalCode('30110012'), '30110012');
  });

  it('rejects invalid', () => {
    assert.equal(normalizeBrazilianPostalCode('123'), null);
    assert.equal(normalizeBrazilianPostalCode(''), null);
    assert.equal(normalizeBrazilianPostalCode(null), null);
  });
});

describe('partnerAddressChanged', () => {
  it('detects zip change', () => {
    assert.equal(
      partnerAddressChanged(
        { zipCode: '30110012', city: 'Belo Horizonte', state: 'MG' },
        { zipCode: '01310100', city: 'São Paulo', state: 'SP' },
      ),
      true,
    );
  });

  it('ignores unchanged address', () => {
    const same = { zipCode: '30110012', address: 'Rua A', city: 'BH', state: 'MG' };
    assert.equal(partnerAddressChanged(same, same), false);
  });
});

describe('partner register ignores client coordinates', () => {
  const validBase = {
    companyName: 'Fria Tech LTDA',
    tradeName: 'Fria Tech',
    partnerType: 'company',
    document: '52998224725',
    email: 'contato@friatech.example',
    city: 'Belo Horizonte',
    state: 'MG',
    zipCode: '30110012',
    privacyAccepted: true,
    analysisAuthorized: true,
    truthfulnessConfirmed: true,
    latitude: -23.5,
    longitude: -46.6,
  };

  it('strips latitude/longitude from validated payload', () => {
    const result = validatePartnerRegisterBody(validBase);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const data = result.data as Record<string, unknown>;
    assert.equal('latitude' in data, false);
    assert.equal('longitude' in data, false);
    for (const key of PARTNER_REGISTER_BLOCKED_KEYS) {
      assert.equal(key in data, false, `blocked key present: ${key}`);
    }
  });
});

console.log('testes postal-code / register geo ok');
