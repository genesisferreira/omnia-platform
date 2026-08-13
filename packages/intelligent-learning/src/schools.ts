/** Escolas educacionais no LMS Core. Não é uma entidade School nova — mapeia companies. */

export const SCHOOL_KEYS = ['fred-do-frio', 'cte'] as const;
export type SchoolKey = (typeof SCHOOL_KEYS)[number];

export type SchoolBrand = {
  name: string;
  shortName: string;
  theme: 'fred' | 'cte';
  certificateIssuer: string;
  placeholder: boolean;
  notes: string;
  entryPath: string;
  logoLabel: string;
  colors: {
    sidebar: string;
    accent: string;
    banner: string;
    surface: string;
  };
};

export const SCHOOL_BRANDS: Record<SchoolKey, SchoolBrand> = {
  'fred-do-frio': {
    name: 'Fred do Frio',
    shortName: 'Fred',
    theme: 'fred',
    certificateIssuer: 'Fred do Frio — LMS',
    placeholder: false,
    notes: 'Identidade visual existente (brandTheme=fred).',
    entryPath: '/escola/fred-do-frio/login',
    logoLabel: 'Fred',
    colors: {
      sidebar: 'bg-emerald-900',
      accent: 'text-emerald-300',
      banner: 'bg-emerald-800',
      surface: 'bg-emerald-50',
    },
  },
  cte: {
    name: 'CTE',
    shortName: 'CTE',
    theme: 'cte',
    certificateIssuer: 'CTE — Formação Técnica',
    placeholder: true,
    notes:
      'CTE STAGING BRAND PLACEHOLDER. Sem assets oficiais no repositório. Logo slot, cores, nome, login/dashboard context e issuer configuráveis — identidade definitiva NÃO homologada.',
    entryPath: '/escola/cte/login',
    logoLabel: 'CTE',
    colors: {
      sidebar: 'bg-slate-900',
      accent: 'text-sky-300',
      banner: 'bg-slate-800',
      surface: 'bg-slate-100',
    },
  },
};

const SLUG_ALIASES: Record<string, SchoolKey> = {
  'fred-do-frio': 'fred-do-frio',
  'fred-do-frio-academy': 'fred-do-frio',
  fred: 'fred-do-frio',
  cte: 'cte',
};

export function isSchoolKey(value: unknown): value is SchoolKey {
  return value === 'fred-do-frio' || value === 'cte';
}

/** Resolve escola a partir de dados de servidor (company/curso). Nunca confiar só no browser. */
export function resolveSchoolKey(input: {
  schoolKey?: unknown;
  brandTheme?: unknown;
  slug?: unknown;
  portalSlug?: unknown;
}): SchoolKey | null {
  if (isSchoolKey(input.schoolKey)) return input.schoolKey;
  const theme = typeof input.brandTheme === 'string' ? input.brandTheme.toLowerCase() : '';
  if (theme === 'fred') return 'fred-do-frio';
  if (theme === 'cte') return 'cte';
  for (const raw of [input.slug, input.portalSlug]) {
    if (typeof raw === 'string') {
      const key = SLUG_ALIASES[raw.trim().toLowerCase()];
      if (key) return key;
    }
  }
  return null;
}

export function schoolsIsolated(a: SchoolKey | null, b: SchoolKey | null): boolean {
  if (!a || !b) return true;
  return a !== b;
}

export function assertSchoolAccess(input: {
  resourceSchool: SchoolKey | null;
  actorSchool: SchoolKey | null;
  actorSchools?: SchoolKey[];
  isAdmin?: boolean;
}): { ok: true } | { ok: false; code: 'CROSS_SCHOOL' } {
  if (input.isAdmin) return { ok: true };
  const allowed = new Set(
    (input.actorSchools?.length ? input.actorSchools : [input.actorSchool]).filter(isSchoolKey),
  );
  if (!input.resourceSchool) return { ok: false, code: 'CROSS_SCHOOL' };
  if (!allowed.has(input.resourceSchool)) return { ok: false, code: 'CROSS_SCHOOL' };
  return { ok: true };
}

export function schoolLabel(key: SchoolKey | null): string {
  return key ? SCHOOL_BRANDS[key].name : 'Omnia LMS';
}

export function schoolBrand(key: SchoolKey | string | null | undefined): SchoolBrand | null {
  return isSchoolKey(key) ? SCHOOL_BRANDS[key] : null;
}

export function parseSchoolKeyParam(raw: unknown): SchoolKey | null {
  if (typeof raw !== 'string') return null;
  return resolveSchoolKey({ schoolKey: raw, slug: raw, portalSlug: raw });
}

export function filterEntitiesBySchool<T extends { schoolKey?: unknown }>(
  rows: T[],
  schoolKey: SchoolKey | null,
): T[] {
  return rows.filter((row) => {
    const key = resolveSchoolKey({ schoolKey: row.schoolKey });
    if (!key) return false;
    return !schoolKey || key === schoolKey;
  });
}
