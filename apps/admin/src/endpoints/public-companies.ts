import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload';

const COMPANIES_COLLECTION = 'companies' as CollectionSlug;
const HOLDING_SLUG = 'omnia-frigo-holding';
const PUBLIC_COMPANIES_LIMIT = 20;
const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=30';
/** Base fixa só para validar caminhos relativos same-host (não é URL pública). */
const LOGO_INTERNAL_BASE = 'https://omnia.internal';

export type PublicCompanyLogoDto = {
  url: string;
  alt: string | null;
};

export type PublicCompanyDto = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  ecosystemRole: string;
  displayOrder: number;
  externalSite: string | null;
  logo: PublicCompanyLogoDto | null;
};

export type PublicCompaniesSuccessBody = {
  ok: true;
  companies: PublicCompanyDto[];
};

export type PublicCompaniesErrorBody = {
  ok: false;
  error: {
    code: 'INTERNAL_ERROR';
    message: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readRequiredString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Aceita apenas http: / https:. Qualquer outro protocolo ou URL inválida → null.
 */
export const sanitizeExternalSite = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
};

/**
 * Allowlist de logo.url:
 * - caminho relativo same-host (`/...`, sem `//`);
 * - URL absoluta http:/https: sem credenciais embutidas.
 */
export const sanitizeLogoUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  // Barras invertidas geram parsing ambíguo / escape de origem em browsers.
  if (trimmed.includes('\\')) {
    return null;
  }

  if (trimmed.startsWith('//')) {
    return null;
  }

  if (trimmed.startsWith('/')) {
    try {
      const base = new URL(LOGO_INTERNAL_BASE);
      const parsed = new URL(trimmed, base);

      if (parsed.origin !== base.origin) {
        return null;
      }

      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    if (parsed.username !== '' || parsed.password !== '') {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
};

export const sanitizeLogoAlt = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export const mapPublicCompanyLogo = (value: unknown): PublicCompanyLogoDto | null => {
  if (!isRecord(value)) {
    return null;
  }

  const url = sanitizeLogoUrl(value.url);
  if (!url) {
    return null;
  }

  return {
    url,
    alt: sanitizeLogoAlt(value.alt),
  };
};

export const normalizeDisplayOrder = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return 0;
};

/**
 * Mapeia um documento bruto da Local API para o DTO público.
 * Retorna null se o documento deve ser omitido (filtros de defesa).
 */
export const mapPublicCompany = (doc: unknown): PublicCompanyDto | null => {
  if (!isRecord(doc)) {
    return null;
  }

  if (doc.status !== 'active') {
    return null;
  }

  const slug = readRequiredString(doc.slug);
  if (!slug || slug === HOLDING_SLUG) {
    return null;
  }

  const name = readRequiredString(doc.name);
  const shortDescription = readRequiredString(doc.shortDescription);
  const ecosystemRole = readRequiredString(doc.ecosystemRole);

  if (!name || !shortDescription || !ecosystemRole) {
    return null;
  }

  const rawId = doc.id;
  if (rawId === null || rawId === undefined) {
    return null;
  }

  if (typeof rawId !== 'string' && typeof rawId !== 'number') {
    return null;
  }

  const id = String(rawId);
  if (id.trim() === '') {
    return null;
  }

  return {
    id,
    name,
    slug,
    shortDescription,
    ecosystemRole,
    displayOrder: normalizeDisplayOrder(doc.displayOrder),
    externalSite: sanitizeExternalSite(doc.externalSite),
    logo: mapPublicCompanyLogo(doc.logo),
  };
};

export const sortPublicCompaniesByDisplayOrder = (
  companies: PublicCompanyDto[],
): PublicCompanyDto[] =>
  [...companies].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.slug.localeCompare(b.slug);
  });

const jsonResponse = (
  status: number,
  body: PublicCompaniesSuccessBody | PublicCompaniesErrorBody,
): Response =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': CACHE_CONTROL,
    },
  });

export const publicCompaniesEndpoint: Endpoint = {
  path: '/omnia/public-companies',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const result = await req.payload.find({
        collection: COMPANIES_COLLECTION,
        where: {
          and: [{ status: { equals: 'active' } }, { slug: { not_equals: HOLDING_SLUG } }],
        },
        sort: 'displayOrder',
        limit: PUBLIC_COMPANIES_LIMIT,
        depth: 1,
        overrideAccess: true,
      });

      const companies = sortPublicCompaniesByDisplayOrder(
        result.docs
          .map((doc) => mapPublicCompany(doc))
          .filter((company): company is PublicCompanyDto => company !== null),
      );

      return jsonResponse(200, {
        ok: true,
        companies,
      });
    } catch {
      req.payload.logger.error('public-companies: failed to load companies');

      return jsonResponse(500, {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Não foi possível carregar as empresas.',
        },
      });
    }
  },
};
