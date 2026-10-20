/**
 * Abstração de geocodificação — Nominatim com cascata de queries.
 *
 * Env:
 * - GEOCODING_PROVIDER=none|nominatim (default: nominatim em staging se setado; senão none)
 * - GEOCODING_USER_AGENT
 * - GEOCODING_TIMEOUT_MS=8000
 */

import { normalizeCoordinatePair } from '@omnia/shared';

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  label?: string;
  provider: string;
};

export type GeocodeAddressInput = {
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

export type GeocodingProvider = {
  readonly name: string;
  geocodeByPostalCode(postalCode: string, country?: string): Promise<GeocodeResult | null>;
  geocodeByAddress(address: string): Promise<GeocodeResult | null>;
  geocodeStructured(input: GeocodeAddressInput): Promise<GeocodeResult | null>;
};

function timeoutMs(): number {
  const n = Number(process.env.GEOCODING_TIMEOUT_MS || 8000);
  return Number.isFinite(n) && n >= 1000 ? Math.min(n, 20000) : 8000;
}

class NoneGeocodingProvider implements GeocodingProvider {
  readonly name = 'none';
  async geocodeByPostalCode(): Promise<GeocodeResult | null> {
    return null;
  }
  async geocodeByAddress(): Promise<GeocodeResult | null> {
    return null;
  }
  async geocodeStructured(): Promise<GeocodeResult | null> {
    return null;
  }
}

class NominatimGeocodingProvider implements GeocodingProvider {
  readonly name = 'nominatim';
  private readonly userAgent: string;

  constructor(userAgent: string) {
    this.userAgent = userAgent;
  }

  private async search(query: string): Promise<GeocodeResult | null> {
    const q = query.trim();
    if (q.length < 3) {
      return null;
    }
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'br');

    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent,
        },
        signal: AbortSignal.timeout(timeoutMs()),
      });
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
      }>;
      const first = data[0];
      if (!first?.lat || !first?.lon) {
        return null;
      }
      const pair = normalizeCoordinatePair(first.lat, first.lon);
      if (!pair) {
        return null;
      }
      return {
        latitude: pair.latitude,
        longitude: pair.longitude,
        label: first.display_name,
        provider: this.name,
      };
    } catch {
      return null;
    }
  }

  async geocodeByPostalCode(postalCode: string, country = 'Brasil'): Promise<GeocodeResult | null> {
    const cep = postalCode.replace(/\D/g, '');
    if (cep.length !== 8) {
      return null;
    }
    return this.search(`${cep}, ${country}`);
  }

  async geocodeByAddress(address: string): Promise<GeocodeResult | null> {
    return this.search(address);
  }

  async geocodeStructured(input: GeocodeAddressInput): Promise<GeocodeResult | null> {
    const country = (input.country || 'Brasil').trim() || 'Brasil';
    const cep = (input.postalCode || '').replace(/\D/g, '');
    const street = (input.street || '').trim();
    const number = (input.number || '').trim();
    const neighborhood = (input.neighborhood || '').trim();
    const city = (input.city || '').trim();
    const state = (input.state || '').trim().toUpperCase();

    const attempts: string[] = [];
    if (street && number && city) {
      attempts.push(
        [street, number, neighborhood, city, state, cep, country].filter(Boolean).join(', '),
      );
    }
    if (street && city) {
      attempts.push([street, neighborhood, city, state, cep, country].filter(Boolean).join(', '));
    }
    if (cep.length === 8 && city) {
      attempts.push([cep, city, state, country].filter(Boolean).join(', '));
    } else if (cep.length === 8) {
      attempts.push(`${cep}, ${country}`);
    }
    if (city && state) {
      attempts.push([city, state, country].filter(Boolean).join(', '));
    }

    const seen = new Set<string>();
    for (const q of attempts) {
      const key = q.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const result = await this.search(q);
      if (result) {
        return result;
      }
      // Nominatim: 1 req/s de cortesia
      await new Promise((r) => setTimeout(r, 1100));
    }
    return null;
  }
}

let cached: GeocodingProvider | null = null;

export function getGeocodingProvider(): GeocodingProvider {
  if (cached) {
    return cached;
  }
  const name = (process.env.GEOCODING_PROVIDER || 'none').trim().toLowerCase();
  if (name === 'nominatim') {
    const ua =
      process.env.GEOCODING_USER_AGENT?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      'OmniaPlatform/1.0 (partner-network; contact=platform@omniafrigo.com.br)';
    cached = new NominatimGeocodingProvider(ua);
    return cached;
  }
  cached = new NoneGeocodingProvider();
  return cached;
}

export function resetGeocodingProviderForTests(): void {
  cached = null;
}
