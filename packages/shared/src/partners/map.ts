import { isUsableCoordinatePair, normalizeCoordinatePair } from './coordinates';
import { haversineDistanceKm, roundDistanceKm } from './haversine';
import { isPartnerPubliclyVisible } from './publication';
import type {
  PublicPartnerDetailDto,
  PublicPartnerListItemDto,
  PublicPartnerMediaDto,
  PublicPartnerServiceCityDto,
  PublicPartnerTaxonomyDto,
} from './types';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const t = value.trim();
  return t === '' ? null : t;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const asId = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return null;
};

export const mapPublicPartnerMedia = (value: unknown): PublicPartnerMediaDto | null => {
  const doc = asRecord(value);
  if (!doc) {
    return null;
  }
  const id = asId(doc.id);
  const url = asString(doc.url);
  if (!id || !url) {
    return null;
  }
  return {
    id,
    url,
    alt: asString(doc.alt) ?? asString(doc.filename),
  };
};

const mapTaxonomy = (value: unknown): PublicPartnerTaxonomyDto | null => {
  const doc = asRecord(value);
  if (!doc) {
    return null;
  }
  const id = asId(doc.id);
  const name = asString(doc.name);
  const slug = asString(doc.slug);
  if (!id || !name || !slug) {
    return null;
  }
  if (doc.active === false) {
    return null;
  }
  return { id, name, slug };
};

const mapTaxonomyList = (value: unknown): PublicPartnerTaxonomyDto[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => mapTaxonomy(item))
    .filter((item): item is PublicPartnerTaxonomyDto => item !== null);
};

const mapServiceCities = (value: unknown): PublicPartnerServiceCityDto[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: PublicPartnerServiceCityDto[] = [];
  for (const item of value) {
    const row = asRecord(item);
    if (!row) continue;
    const city = asString(row.city);
    if (!city) continue;
    out.push({ city, state: asString(row.state) });
  }
  return out;
};

const displayNameOf = (doc: Record<string, unknown>): string => {
  return asString(doc.tradeName) ?? asString(doc.companyName) ?? 'Parceiro';
};

export type MapPartnerOrigin = { lat: number; lng: number } | null;

export const mapPublicPartnerListItem = (
  raw: unknown,
  origin: MapPartnerOrigin = null,
): PublicPartnerListItemDto | null => {
  const doc = asRecord(raw);
  if (!doc || !isPartnerPubliclyVisible(doc)) {
    return null;
  }

  const id = asId(doc.id);
  const slug = asString(doc.slug);
  const companyName = asString(doc.companyName);
  if (!id || !slug || !companyName) {
    return null;
  }

  const partnerType = doc.partnerType === 'professional' ? 'professional' : 'company';
  const lat = asNumber(doc.latitude);
  const lng = asNumber(doc.longitude);
  const usableCoords = isUsableCoordinatePair(lat, lng);
  let distanceKm: number | null = null;
  if (origin && usableCoords) {
    const d = haversineDistanceKm(origin.lat, origin.lng, lat!, lng!);
    distanceKm = d == null ? null : roundDistanceKm(d);
  }

  return {
    id,
    slug,
    companyName,
    tradeName: asString(doc.tradeName),
    displayName: displayNameOf(doc),
    partnerType,
    city: asString(doc.city),
    state: asString(doc.state),
    country: asString(doc.country),
    coverageRadius: asNumber(doc.coverageRadius),
    featured: doc.featured === true,
    verified: doc.verified === true,
    publishedAt: asString(doc.publishedAt) ?? (doc.publishedAt instanceof Date ? doc.publishedAt.toISOString() : null),
    logo: mapPublicPartnerMedia(doc.logo),
    categories: mapTaxonomyList(doc.categories),
    specialties: mapTaxonomyList(doc.specialties),
    distanceKm,
  };
};

export const mapPublicPartnerDetail = (
  raw: unknown,
  origin: MapPartnerOrigin = null,
): PublicPartnerDetailDto | null => {
  const base = mapPublicPartnerListItem(raw, origin);
  if (!base) {
    return null;
  }
  const doc = asRecord(raw)!;
  const partnerType = base.partnerType;
  const showFullAddress = partnerType === 'company';

  const addressParts = showFullAddress
    ? [
        asString(doc.address),
        asString(doc.addressNumber),
        asString(doc.neighborhood),
      ].filter(Boolean)
    : [];

  const social = asRecord(doc.social) ?? {};
  const galleryRaw = Array.isArray(doc.gallery) ? doc.gallery : [];
  const gallery: PublicPartnerDetailDto['gallery'] = [];
  for (const item of galleryRaw) {
    const row = asRecord(item);
    if (!row) continue;
    const image = mapPublicPartnerMedia(row.image);
    if (!image) continue;
    gallery.push({ image, caption: asString(row.caption) });
  }

  const brands = Array.isArray(doc.brandsServed)
    ? doc.brandsServed
        .map((b) => (typeof b === 'string' ? b.trim() : asString(asRecord(b)?.name)))
        .filter((b): b is string => Boolean(b))
    : [];

  const coords = normalizeCoordinatePair(doc.latitude, doc.longitude);

  return {
    ...base,
    description: asString(doc.description),
    servicesDescription: asString(doc.servicesDescription),
    brandsServed: brands,
    serviceCities: mapServiceCities(doc.serviceCities),
    website: asString(doc.website),
    phone: asString(doc.phone),
    whatsapp: asString(doc.whatsapp),
    social: {
      instagram: asString(social.instagram),
      linkedin: asString(social.linkedin),
      facebook: asString(social.facebook),
      youtube: asString(social.youtube),
    },
    gallery,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    showFullAddress,
    addressLine: addressParts.length > 0 ? addressParts.join(', ') : null,
  };
};

export type SortablePartner = PublicPartnerListItemDto;

/**
 * Ordenação: com distância → dentro do raio, menor distância, featured, verified, nome.
 * Sem distância → featured, verified, publishedAt desc.
 * Sem coordenadas ficam depois dos que têm distância.
 *
 * `withinRadiusOnly`: remove quem está fora do raio ou sem distância (quando há origem).
 */
export function sortPublicPartners(
  items: SortablePartner[],
  options?: {
    radiusKm?: number | null;
    hasOrigin?: boolean;
    withinRadiusOnly?: boolean;
  },
): SortablePartner[] {
  const radiusKm = options?.radiusKm ?? null;
  const hasOrigin = options?.hasOrigin === true;
  const withinRadiusOnly = options?.withinRadiusOnly === true;

  let list = [...items];
  if (hasOrigin && withinRadiusOnly && radiusKm != null) {
    list = list.filter((p) => p.distanceKm != null && p.distanceKm <= radiusKm);
  } else if (hasOrigin && withinRadiusOnly) {
    list = list.filter((p) => p.distanceKm != null);
  }

  return list.sort((a, b) => {
    if (hasOrigin) {
      const aHas = a.distanceKm != null;
      const bHas = b.distanceKm != null;
      if (aHas !== bHas) {
        return aHas ? -1 : 1;
      }
      if (aHas && bHas) {
        const aIn = radiusKm == null || a.distanceKm! <= radiusKm;
        const bIn = radiusKm == null || b.distanceKm! <= radiusKm;
        if (aIn !== bIn) {
          return aIn ? -1 : 1;
        }
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm! - b.distanceKm!;
        }
      }
    }
    if (a.featured !== b.featured) {
      return a.featured ? -1 : 1;
    }
    if (a.verified !== b.verified) {
      return a.verified ? -1 : 1;
    }
    const nameCmp = a.displayName.localeCompare(b.displayName, 'pt-BR');
    if (nameCmp !== 0) {
      return nameCmp;
    }
    const ap = a.publishedAt ?? '';
    const bp = b.publishedAt ?? '';
    if (ap !== bp) {
      return bp.localeCompare(ap);
    }
    return a.slug.localeCompare(b.slug);
  });
}

export function buildWhatsAppUrl(
  whatsapp: string | null | undefined,
  message: string,
): string | null {
  if (!whatsapp) {
    return null;
  }
  const digits = whatsapp.replace(/\D/g, '');
  if (digits.length < 10) {
    return null;
  }
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
