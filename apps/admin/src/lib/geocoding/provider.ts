/**
 * Abstração de geocodificação — sem acoplar a um provedor.
 *
 * Env:
 * - GEOCODING_PROVIDER=none|nominatim (default: none)
 * - GEOCODING_API_KEY (reservado; não obrigatório para nominatim público)
 * - GEOCODING_USER_AGENT (obrigatório para Nominatim — política de uso)
 *
 * Sem provedor: retorna null; cadastro e busca por cidade/estado seguem OK.
 */

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type GeocodingProvider = {
  readonly name: string;
  geocodeByPostalCode(postalCode: string, country?: string): Promise<GeocodeResult | null>;
  geocodeByAddress(address: string): Promise<GeocodeResult | null>;
};

class NoneGeocodingProvider implements GeocodingProvider {
  readonly name = 'none';
  async geocodeByPostalCode(): Promise<GeocodeResult | null> {
    return null;
  }
  async geocodeByAddress(): Promise<GeocodeResult | null> {
    return null;
  }
}

/** Nominatim (OpenStreetMap) — uso leve; exige User-Agent identificável. */
class NominatimGeocodingProvider implements GeocodingProvider {
  readonly name = 'nominatim';
  private readonly userAgent: string;

  constructor(userAgent: string) {
    this.userAgent = userAgent;
  }

  private async search(query: string): Promise<GeocodeResult | null> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': this.userAgent,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const first = data[0];
    if (!first?.lat || !first?.lon) {
      return null;
    }
    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    return { latitude, longitude, label: first.display_name };
  }

  async geocodeByPostalCode(postalCode: string, country = 'Brasil'): Promise<GeocodeResult | null> {
    const cep = postalCode.replace(/\D/g, '');
    if (cep.length < 8) {
      return null;
    }
    return this.search(`${cep}, ${country}`);
  }

  async geocodeByAddress(address: string): Promise<GeocodeResult | null> {
    const q = address.trim();
    if (q.length < 5) {
      return null;
    }
    return this.search(q);
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
      'OmniaPlatform/1.0 (partner-network; contact=dev@localhost)';
    cached = new NominatimGeocodingProvider(ua);
    return cached;
  }
  cached = new NoneGeocodingProvider();
  return cached;
}

/** Apenas testes. */
export function resetGeocodingProviderForTests(): void {
  cached = null;
}
