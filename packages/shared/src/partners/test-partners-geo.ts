import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  haversineDistanceKm,
  isNullIsland,
  isUsableCoordinatePair,
  parseOptionalCoordinate,
  sortPublicPartners,
  type PublicPartnerListItemDto,
} from '../index';

function partner(
  partial: Partial<PublicPartnerListItemDto> &
    Pick<PublicPartnerListItemDto, 'slug' | 'distanceKm'>,
): PublicPartnerListItemDto {
  return {
    id: partial.id ?? partial.slug,
    slug: partial.slug,
    companyName: partial.companyName ?? partial.slug,
    tradeName: partial.tradeName ?? null,
    displayName: partial.displayName ?? partial.slug,
    partnerType: partial.partnerType ?? 'company',
    city: partial.city ?? null,
    state: partial.state ?? null,
    country: partial.country ?? 'Brasil',
    coverageRadius: null,
    featured: partial.featured ?? false,
    verified: partial.verified ?? false,
    publishedAt: partial.publishedAt ?? '2026-01-01',
    logo: null,
    categories: [],
    specialties: [],
    distanceKm: partial.distanceKm,
  };
}

describe('parseOptionalCoordinate', () => {
  it('parses finite numbers and numeric strings', () => {
    assert.equal(parseOptionalCoordinate(-19.9), -19.9);
    assert.equal(parseOptionalCoordinate('-46.63'), -46.63);
  });

  it('never falls back to zero for empty/invalid', () => {
    assert.equal(parseOptionalCoordinate(null), null);
    assert.equal(parseOptionalCoordinate(undefined), null);
    assert.equal(parseOptionalCoordinate(''), null);
    assert.equal(parseOptionalCoordinate('  '), null);
    assert.equal(parseOptionalCoordinate('abc'), null);
    assert.equal(parseOptionalCoordinate(Number.NaN), null);
  });

  it('preserves explicit zero (pair validation rejects 0,0)', () => {
    assert.equal(parseOptionalCoordinate(0), 0);
    assert.equal(parseOptionalCoordinate('0'), 0);
  });
});

describe('coordinate usability', () => {
  it('rejects null island and out of range', () => {
    assert.equal(isNullIsland(0, 0), true);
    assert.equal(isUsableCoordinatePair(0, 0), false);
    assert.equal(isUsableCoordinatePair(91, -46), false);
    assert.equal(isUsableCoordinatePair(-19.9, -43.9), true);
  });
});

describe('haversine BH / Contagem / SP', () => {
  // Aprox. Praça da Liberdade BH e Contagem centro / Av. Paulista
  const BH = { lat: -19.932, lng: -43.938 };
  const CONTAGEM = { lat: -19.932, lng: -44.053 };
  const SP = { lat: -23.561, lng: -46.655 };

  it('same point ~0', () => {
    const d = haversineDistanceKm(BH.lat, BH.lng, BH.lat, BH.lng);
    assert.ok(d != null && d < 0.01);
  });

  it('BH to Contagem is small', () => {
    const d = haversineDistanceKm(BH.lat, BH.lng, CONTAGEM.lat, CONTAGEM.lng);
    assert.ok(d != null);
    assert.ok(d > 5 && d < 30, `got ${d}`);
  });

  it('BH to SP is hundreds of km', () => {
    const d = haversineDistanceKm(BH.lat, BH.lng, SP.lat, SP.lng);
    assert.ok(d != null);
    assert.ok(d > 400 && d < 700, `got ${d}`);
  });

  it('rejects 0,0', () => {
    assert.equal(haversineDistanceKm(0, 0, BH.lat, BH.lng), null);
    assert.equal(haversineDistanceKm(BH.lat, BH.lng, 0, 0), null);
  });
});

describe('proximity sort BH before SP', () => {
  it('orders BH partner before SP for BH origin distances', () => {
    const sorted = sortPublicPartners(
      [
        partner({
          slug: 'sp-partner',
          city: 'São Paulo',
          state: 'SP',
          featured: true,
          distanceKm: 520,
        }),
        partner({
          slug: 'bh-partner',
          city: 'Belo Horizonte',
          state: 'MG',
          featured: false,
          distanceKm: 3.2,
        }),
      ],
      { hasOrigin: true, radiusKm: 50, withinRadiusOnly: true },
    );
    assert.equal(sorted.length, 1);
    assert.equal(sorted[0]?.slug, 'bh-partner');
  });

  it('featured does not beat nearer partner', () => {
    const sorted = sortPublicPartners(
      [
        partner({ slug: 'far-featured', featured: true, distanceKm: 40 }),
        partner({ slug: 'near', featured: false, distanceKm: 5 }),
      ],
      { hasOrigin: true, radiusKm: 50 },
    );
    assert.equal(sorted[0]?.slug, 'near');
    assert.equal(sorted[1]?.slug, 'far-featured');
  });

  it('without origin does not invent distance order', () => {
    const sorted = sortPublicPartners(
      [
        partner({ slug: 'zulu', featured: false, distanceKm: null }),
        partner({ slug: 'alfa', featured: true, distanceKm: null }),
      ],
      { hasOrigin: false },
    );
    assert.equal(sorted[0]?.slug, 'alfa');
  });
});

console.log('testes partners geo (shared) ok');
