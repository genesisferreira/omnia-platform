import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildWhatsAppUrl,
  haversineDistanceKm,
  isPartnerPubliclyVisible,
  mapPublicPartnerDetail,
  mapPublicPartnerListItem,
  PARTNER_PRIVATE_FIELD_KEYS,
  roundDistanceKm,
  sortPublicPartners,
  validateBrazilianDocument,
} from '../index';

describe('isPartnerPubliclyVisible', () => {
  it('rejects pending draft rejected suspended', () => {
    for (const status of ['pending', 'draft', 'rejected', 'suspended']) {
      assert.equal(
        isPartnerPubliclyVisible({ status, active: true, publishedAt: '2026-01-01' }),
        false,
      );
    }
  });

  it('requires active and publishedAt', () => {
    assert.equal(
      isPartnerPubliclyVisible({ status: 'approved', active: false, publishedAt: '2026-01-01' }),
      false,
    );
    assert.equal(
      isPartnerPubliclyVisible({ status: 'approved', active: true, publishedAt: null }),
      false,
    );
    assert.equal(
      isPartnerPubliclyVisible({ status: 'approved', active: true, publishedAt: '2026-01-01' }),
      true,
    );
  });
});

describe('mapPublicPartner — privacy', () => {
  const base = {
    id: 1,
    slug: 'fria-tech',
    companyName: 'Fria Tech LTDA',
    tradeName: 'Fria Tech',
    partnerType: 'company',
    status: 'approved',
    active: true,
    publishedAt: '2026-01-01T00:00:00.000Z',
    document: '12345678901234',
    email: 'secret@example.com',
    approvalNotes: 'interno',
    approvedBy: 9,
    ownerUser: 3,
    city: 'Campinas',
    state: 'SP',
    featured: true,
    verified: true,
  };

  it('list item omits private fields', () => {
    const mapped = mapPublicPartnerListItem(base);
    assert.ok(mapped);
    const json = JSON.stringify(mapped);
    for (const key of PARTNER_PRIVATE_FIELD_KEYS) {
      assert.equal(json.includes(`"${key}"`), false, `leaked ${key}`);
    }
    assert.equal(json.includes('secret@example.com'), false);
    assert.equal(json.includes('12345678901234'), false);
  });

  it('detail does not expose document or email', () => {
    const mapped = mapPublicPartnerDetail(base);
    assert.ok(mapped);
    assert.equal('document' in mapped, false);
    assert.equal('email' in mapped, false);
    assert.equal('approvalNotes' in mapped, false);
  });

  it('non-public partner maps to null', () => {
    assert.equal(mapPublicPartnerListItem({ ...base, status: 'pending' }), null);
  });
});

describe('haversine', () => {
  it('returns ~0 for same point', () => {
    const d = haversineDistanceKm(-23.55, -46.63, -23.55, -46.63);
    assert.ok(d != null && d < 0.01);
  });

  it('SP to RJ roughly 350-400 km', () => {
    const d = haversineDistanceKm(-23.55, -46.63, -22.9, -43.2);
    assert.ok(d != null);
    assert.ok(d > 340 && d < 420, `got ${d}`);
  });

  it('sort prefers nearer then featured', () => {
    const sorted = sortPublicPartners(
      [
        {
          id: '1',
          slug: 'a',
          companyName: 'A',
          tradeName: null,
          displayName: 'A',
          partnerType: 'company',
          city: null,
          state: null,
          country: null,
          coverageRadius: null,
          featured: true,
          verified: false,
          publishedAt: '2026-01-01',
          logo: null,
          categories: [],
          specialties: [],
          distanceKm: 40,
        },
        {
          id: '2',
          slug: 'b',
          companyName: 'B',
          tradeName: null,
          displayName: 'B',
          partnerType: 'company',
          city: null,
          state: null,
          country: null,
          coverageRadius: null,
          featured: false,
          verified: true,
          publishedAt: '2026-02-01',
          logo: null,
          categories: [],
          specialties: [],
          distanceKm: 10,
        },
        {
          id: '3',
          slug: 'c',
          companyName: 'C',
          tradeName: null,
          displayName: 'C',
          partnerType: 'company',
          city: null,
          state: null,
          country: null,
          coverageRadius: null,
          featured: true,
          verified: true,
          publishedAt: '2026-03-01',
          logo: null,
          categories: [],
          specialties: [],
          distanceKm: null,
        },
      ],
      { hasOrigin: true, radiusKm: 50 },
    );
    assert.equal(sorted[0]?.slug, 'b');
    assert.equal(sorted[1]?.slug, 'a');
    assert.equal(sorted[2]?.slug, 'c');
  });

  it('roundDistanceKm', () => {
    assert.equal(roundDistanceKm(12.34), 12.3);
  });
});

describe('document', () => {
  it('validates CPF check digits', () => {
    // CPF válido conhecido: 529.982.247-25
    const r = validateBrazilianDocument('52998224725');
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.kind, 'cpf');
  });

  it('rejects invalid length', () => {
    const r = validateBrazilianDocument('123');
    assert.equal(r.ok, false);
  });
});

describe('whatsapp url', () => {
  it('builds wa.me with country code', () => {
    const url = buildWhatsAppUrl('11999998888', 'Olá');
    assert.ok(url?.startsWith('https://wa.me/5511999998888'));
  });

  it('returns null without number', () => {
    assert.equal(buildWhatsAppUrl(null, 'x'), null);
  });
});

console.log('testes partners (shared) ok');
