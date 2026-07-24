import type { Endpoint, PayloadRequest, Where } from 'payload';

import {
  mapPublicPartnerDetail,
  mapPublicPartnerListItem,
  PUBLIC_PARTNER_DEFAULT_RADIUS_KM,
  PUBLIC_PARTNER_HOME_LIMIT,
  PUBLIC_PARTNER_LIST_DEFAULT_LIMIT,
  PUBLIC_PARTNER_LIST_MAX_LIMIT,
  PUBLIC_PARTNER_MAX_RADIUS_KM,
  sortPublicPartners,
} from '@omnia/shared';

import { getGeocodingProvider } from '../lib/geocoding/provider';
import {
  lookupPostalCode,
  normalizeBrazilianPostalCode,
} from '../lib/postal-code/provider';

const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=30';

const json = (status: number, body: unknown, cache = true): Response =>
  Response.json(body, {
    status,
    headers: cache ? { 'Cache-Control': CACHE_CONTROL } : { 'Cache-Control': 'no-store' },
  });

function publicVisibilityWhere(): Where {
  return {
    and: [
      { status: { equals: 'approved' } },
      { active: { equals: true } },
      { publishedAt: { exists: true } },
    ],
  };
}

function parseOrigin(url: URL): { lat: number; lng: number } | null {
  const latRaw = url.searchParams.get('lat');
  const lngRaw = url.searchParams.get('lng');
  if (latRaw == null || lngRaw == null || latRaw.trim() === '' || lngRaw.trim() === '') {
    return null;
  }
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  if (lat === 0 && lng === 0) {
    return null;
  }
  return { lat, lng };
}

function clampRadiusKm(raw: string | null, hasOrigin: boolean): number | null {
  if (raw == null || raw === '') {
    return hasOrigin ? PUBLIC_PARTNER_DEFAULT_RADIUS_KM : null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return PUBLIC_PARTNER_DEFAULT_RADIUS_KM;
  }
  return Math.min(n, PUBLIC_PARTNER_MAX_RADIUS_KM);
}

async function resolveOriginFromQuery(
  url: URL,
): Promise<{
  origin: { lat: number; lng: number } | null;
  originSource: 'gps' | 'postalCode' | 'city' | null;
}> {
  const gps = parseOrigin(url);
  if (gps) {
    return { origin: gps, originSource: 'gps' };
  }

  const cep = normalizeBrazilianPostalCode(
    url.searchParams.get('postalCode') || url.searchParams.get('zipCode') || '',
  );
  if (cep) {
    const lookup = await lookupPostalCode(cep);
    if (lookup) {
      const geo = await getGeocodingProvider().geocodeStructured({
        postalCode: lookup.postalCode,
        street: lookup.street,
        neighborhood: lookup.neighborhood,
        city: lookup.city,
        state: lookup.state,
        country: lookup.country,
      });
      if (geo) {
        return { origin: { lat: geo.latitude, lng: geo.longitude }, originSource: 'postalCode' };
      }
    }
  }

  const city = url.searchParams.get('city')?.trim();
  const state = url.searchParams.get('state')?.trim()?.toUpperCase();
  // Só geocodifica cidade como origem se o usuário pediu explicitamente (originCity=1)
  // ou se não há filtro de cidade nos parceiros e há nearCity.
  const nearCity = url.searchParams.get('nearCity')?.trim() || city;
  const nearState = url.searchParams.get('nearState')?.trim()?.toUpperCase() || state;
  const useCityOrigin =
    url.searchParams.get('locateByCity') === '1' ||
    Boolean(url.searchParams.get('nearCity')?.trim());

  if (useCityOrigin && nearCity && nearState) {
    const geo = await getGeocodingProvider().geocodeStructured({
      city: nearCity,
      state: nearState,
      country: 'Brasil',
    });
    if (geo) {
      return { origin: { lat: geo.latitude, lng: geo.longitude }, originSource: 'city' };
    }
  }

  return { origin: null, originSource: null };
}

export const publicPartnersEndpoint: Endpoint = {
  path: '/omnia/public-partners',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const url = new URL(req.url || 'http://local', 'http://local');
      const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
      let limit = Number(url.searchParams.get('limit') || PUBLIC_PARTNER_LIST_DEFAULT_LIMIT);
      if (!Number.isFinite(limit) || limit < 1) {
        limit = PUBLIC_PARTNER_LIST_DEFAULT_LIMIT;
      }
      limit = Math.min(limit, PUBLIC_PARTNER_LIST_MAX_LIMIT);

      const home = url.searchParams.get('home') === '1';
      if (home) {
        limit = PUBLIC_PARTNER_HOME_LIMIT;
      }

      const city = url.searchParams.get('city')?.trim();
      const state = url.searchParams.get('state')?.trim()?.toUpperCase();
      const category = url.searchParams.get('category')?.trim();
      const specialty = url.searchParams.get('specialty')?.trim();
      const partnerType = url.searchParams.get('partnerType')?.trim();
      const featured = url.searchParams.get('featured');
      const verified = url.searchParams.get('verified');
      const q = url.searchParams.get('q')?.trim();
      const includeOutside =
        url.searchParams.get('includeOutsideRadius') === '1' ||
        url.searchParams.get('withinRadiusOnly') === '0';

      const { origin, originSource } = await resolveOriginFromQuery(url);
      const radiusKm = clampRadiusKm(url.searchParams.get('radiusKm'), Boolean(origin));

      const and: Where[] = [publicVisibilityWhere()];

      // Filtro de cidade/UF do parceiro (quando não usado só como origem).
      const nearCity = url.searchParams.get('nearCity')?.trim();
      const nearState = url.searchParams.get('nearState')?.trim()?.toUpperCase();
      if (city && !nearCity) {
        and.push({ city: { contains: city } });
      }
      if (state && !nearState && url.searchParams.get('locateByCity') !== '1') {
        and.push({ state: { equals: state } });
      }
      if (partnerType === 'company' || partnerType === 'professional') {
        and.push({ partnerType: { equals: partnerType } });
      }
      if (featured === '1' || featured === 'true') {
        and.push({ featured: { equals: true } });
      }
      if (verified === '1' || verified === 'true') {
        and.push({ verified: { equals: true } });
      }
      if (category) {
        const cat = await req.payload.find({
          collection: 'partner-categories',
          where: { and: [{ slug: { equals: category } }, { active: { equals: true } }] },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        const catId = cat.docs[0]?.id;
        if (catId == null) {
          return json(200, {
            ok: true,
            partners: [],
            pagination: { page, limit, totalDocs: 0, totalPages: 1, hasNextPage: false },
            meta: { origin, originSource, radiusKm: null, withinRadiusOnly: false },
          });
        }
        and.push({ categories: { contains: catId } });
      }
      if (specialty) {
        const spec = await req.payload.find({
          collection: 'partner-specialties',
          where: { and: [{ slug: { equals: specialty } }, { active: { equals: true } }] },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        });
        const specId = spec.docs[0]?.id;
        if (specId == null) {
          return json(200, {
            ok: true,
            partners: [],
            pagination: { page, limit, totalDocs: 0, totalPages: 1, hasNextPage: false },
            meta: { origin, originSource, radiusKm: null, withinRadiusOnly: false },
          });
        }
        and.push({ specialties: { contains: specId } });
      }
      if (q) {
        and.push({
          or: [
            { companyName: { contains: q } },
            { tradeName: { contains: q } },
            { city: { contains: q } },
            { state: { equals: q.toUpperCase() } },
            { zipCode: { contains: q.replace(/\D/g, '') } },
          ],
        });
      }

      const fetchLimit = origin ? Math.min(200, PUBLIC_PARTNER_LIST_MAX_LIMIT * 4) : limit;
      const fetchPage = origin ? 1 : page;

      const result = await req.payload.find({
        collection: 'partners',
        where: { and },
        limit: fetchLimit,
        page: fetchPage,
        depth: 1,
        sort: '-publishedAt',
        overrideAccess: true,
      });

      let items = result.docs
        .map((doc) => mapPublicPartnerListItem(doc, origin))
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const withinRadiusOnly = Boolean(origin) && !includeOutside && !home;

      items = sortPublicPartners(items, {
        hasOrigin: Boolean(origin),
        radiusKm,
        withinRadiusOnly,
      });

      // Home: só com distância válida quando origin presente; sem origin não inventa proximidade.
      if (home && origin) {
        items = items.filter((p) => p.distanceKm != null);
      }

      const total = origin ? items.length : result.totalDocs;
      if (origin) {
        const start = (page - 1) * limit;
        items = items.slice(start, start + limit);
      }

      return json(200, {
        ok: true,
        partners: items,
        pagination: {
          page,
          limit,
          totalDocs: total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasNextPage: page * limit < total,
        },
        meta: {
          origin,
          originSource,
          radiusKm,
          withinRadiusOnly,
        },
      });
    } catch {
      req.payload.logger.error('public-partners: failed');
      return json(
        500,
        {
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'Não foi possível carregar os parceiros.' },
        },
        false,
      );
    }
  },
};

export const publicPartnerEndpoint: Endpoint = {
  path: '/omnia/public-partner',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const url = new URL(req.url || 'http://local', 'http://local');
      const slug = url.searchParams.get('slug')?.trim();
      if (!slug) {
        return json(
          400,
          {
            ok: false,
            error: { code: 'BAD_REQUEST', message: 'Parâmetro slug é obrigatório.' },
          },
          false,
        );
      }

      const result = await req.payload.find({
        collection: 'partners',
        where: {
          and: [publicVisibilityWhere(), { slug: { equals: slug } }],
        },
        limit: 1,
        depth: 1,
        overrideAccess: true,
      });

      const doc = result.docs[0];
      const partner = doc ? mapPublicPartnerDetail(doc) : null;
      if (!partner) {
        return json(
          404,
          {
            ok: false,
            error: { code: 'NOT_FOUND', message: 'Parceiro não encontrado.' },
          },
          false,
        );
      }

      return json(200, { ok: true, partner });
    } catch {
      req.payload.logger.error('public-partner: failed');
      return json(
        500,
        {
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'Não foi possível carregar o parceiro.' },
        },
        false,
      );
    }
  },
};

export const publicPartnerCategoriesEndpoint: Endpoint = {
  path: '/omnia/public-partner-categories',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const result = await req.payload.find({
        collection: 'partner-categories',
        where: { active: { equals: true } },
        sort: 'name',
        limit: 100,
        depth: 0,
        overrideAccess: true,
      });
      const items = result.docs
        .map((doc) => {
          const id = doc.id != null ? String(doc.id) : null;
          const name = typeof doc.name === 'string' ? doc.name : null;
          const slug = typeof doc.slug === 'string' ? doc.slug : null;
          if (!id || !name || !slug) return null;
          return { id, name, slug };
        })
        .filter((x): x is { id: string; name: string; slug: string } => x !== null);

      return json(200, { ok: true, items });
    } catch {
      return json(
        500,
        {
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'Falha ao carregar categorias.' },
        },
        false,
      );
    }
  },
};

export const publicPartnerSpecialtiesEndpoint: Endpoint = {
  path: '/omnia/public-partner-specialties',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const result = await req.payload.find({
        collection: 'partner-specialties',
        where: { active: { equals: true } },
        sort: 'sortOrder',
        limit: 200,
        depth: 0,
        overrideAccess: true,
      });
      const items = result.docs
        .map((doc) => {
          const id = doc.id != null ? String(doc.id) : null;
          const name = typeof doc.name === 'string' ? doc.name : null;
          const slug = typeof doc.slug === 'string' ? doc.slug : null;
          if (!id || !name || !slug) return null;
          return { id, name, slug };
        })
        .filter((x): x is { id: string; name: string; slug: string } => x !== null);

      return json(200, { ok: true, items });
    } catch {
      return json(
        500,
        {
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'Falha ao carregar especialidades.' },
        },
        false,
      );
    }
  },
};
