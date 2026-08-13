import { isSchoolKey, resolveSchoolKey, type SchoolKey } from './schools';

/** Política auditável: só atribui escola com evidência. Nunca inventa. */
export const SCHOOLKEY_BACKFILL_POLICY = {
  version: '20260813_200000',
  unknownLabel: 'legacy/unknown',
  rules: [
    'companies.schoolKey from brandTheme fred|cte OR slug/portalSlug aliases',
    'courses.schoolKey from ownerCompany.schoolKey',
    'courses.slug fundamentos-refrigeracao-industrial → fred-do-frio (LMS Core Fred fixture documentado)',
    'classes/enrollments/certificates inherit from course.schoolKey',
    'ILS rows inherit only when the student has exactly one non-null enrollment schoolKey',
    'remaining NULL stays legacy/unknown — not invented',
  ],
} as const;

const FRED_FIXTURE_SLUGS = new Set(['fundamentos-refrigeracao-industrial']);

export function schoolKeyFromCompanyEvidence(input: {
  schoolKey?: unknown;
  brandTheme?: unknown;
  slug?: unknown;
  portalSlug?: unknown;
}): SchoolKey | null {
  return resolveSchoolKey(input);
}

export function schoolKeyFromCourseEvidence(input: {
  schoolKey?: unknown;
  slug?: unknown;
  ownerCompanySchoolKey?: unknown;
}): SchoolKey | null {
  if (isSchoolKey(input.schoolKey)) return input.schoolKey;
  if (isSchoolKey(input.ownerCompanySchoolKey)) return input.ownerCompanySchoolKey;
  if (typeof input.slug === 'string' && FRED_FIXTURE_SLUGS.has(input.slug.trim().toLowerCase())) {
    return 'fred-do-frio';
  }
  return null;
}

export function schoolKeyFromUniqueEnrollmentSchools(keys: unknown[]): SchoolKey | null {
  const unique = [...new Set(keys.filter(isSchoolKey))];
  return unique.length === 1 ? unique[0] : null;
}

export function classifySchoolKeyGap(schoolKey: unknown): 'assigned' | 'legacy_unknown' {
  return isSchoolKey(schoolKey) ? 'assigned' : 'legacy_unknown';
}
