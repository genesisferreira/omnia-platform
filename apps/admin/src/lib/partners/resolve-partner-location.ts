import { normalizeBrazilianPostalCode, lookupPostalCode } from '../postal-code/provider';
import { getGeocodingProvider, type GeocodeResult } from '../geocoding/provider';

export type PartnerLocationFields = {
  zipCode?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geocodingStatus?: 'pending' | 'success' | 'failed' | 'manual' | null;
  geocodingProvider?: string | null;
  geocodedAt?: string | null;
};

const ADDRESS_KEYS = [
  'zipCode',
  'address',
  'addressNumber',
  'neighborhood',
  'city',
  'state',
  'country',
] as const;

export function partnerAddressChanged(
  next: PartnerLocationFields,
  previous: PartnerLocationFields | null | undefined,
): boolean {
  if (!previous) {
    return ADDRESS_KEYS.some((k) => {
      const v = next[k];
      return typeof v === 'string' ? v.trim() !== '' : v != null;
    });
  }
  return ADDRESS_KEYS.some((k) => {
    const a = typeof next[k] === 'string' ? String(next[k]).trim() : next[k];
    const b = typeof previous[k] === 'string' ? String(previous[k]).trim() : previous[k];
    return (a || '') !== (b || '');
  });
}

export async function enrichPartnerLocationFromPostalCode(
  data: PartnerLocationFields,
): Promise<PartnerLocationFields> {
  const cep = normalizeBrazilianPostalCode(data.zipCode);
  if (!cep) {
    return data;
  }
  const lookup = await lookupPostalCode(cep);
  if (!lookup) {
    return { ...data, zipCode: cep };
  }
  return {
    ...data,
    zipCode: cep,
    address: data.address?.trim() ? data.address : lookup.street || data.address,
    neighborhood: data.neighborhood?.trim()
      ? data.neighborhood
      : lookup.neighborhood || data.neighborhood,
    city: data.city?.trim() ? data.city : lookup.city,
    state: data.state?.trim() ? data.state : lookup.state,
    country: data.country?.trim() ? data.country : lookup.country,
  };
}

export async function resolvePartnerGeocode(
  data: PartnerLocationFields,
): Promise<{
  latitude: number | null;
  longitude: number | null;
  geocodingStatus: 'pending' | 'success' | 'failed' | 'manual';
  geocodingProvider: string;
  geocodedAt: string | null;
}> {
  const provider = getGeocodingProvider();
  if (provider.name === 'none') {
    return {
      latitude: null,
      longitude: null,
      geocodingStatus: 'pending',
      geocodingProvider: 'none',
      geocodedAt: null,
    };
  }

  let result: GeocodeResult | null = null;
  try {
    result = await provider.geocodeStructured({
      postalCode: data.zipCode,
      street: data.address,
      number: data.addressNumber,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      country: data.country || 'Brasil',
    });
  } catch {
    result = null;
  }

  if (!result) {
    return {
      latitude: null,
      longitude: null,
      geocodingStatus: 'failed',
      geocodingProvider: provider.name,
      geocodedAt: new Date().toISOString(),
    };
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    geocodingStatus: 'success',
    geocodingProvider: result.provider || provider.name,
    geocodedAt: new Date().toISOString(),
  };
}

/** Aplica enriquecimento CEP + geocode quando endereço mudou (ou create). */
export async function applyPartnerLocationResolution(
  data: PartnerLocationFields,
  previous: PartnerLocationFields | null | undefined,
  options?: { force?: boolean },
): Promise<PartnerLocationFields> {
  const force = options?.force === true;
  const changed = force || partnerAddressChanged(data, previous);
  if (!changed && previous?.geocodingStatus === 'success') {
    return data;
  }

  let next = { ...data };
  next = await enrichPartnerLocationFromPostalCode(next);

  if (next.geocodingStatus === 'manual' && !force) {
    return next;
  }

  const geo = await resolvePartnerGeocode(next);
  return {
    ...next,
    latitude: geo.latitude,
    longitude: geo.longitude,
    geocodingStatus: geo.geocodingStatus,
    geocodingProvider: geo.geocodingProvider,
    geocodedAt: geo.geocodedAt,
  };
}
