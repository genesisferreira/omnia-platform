/** PCAR — sinais observáveis e preferências declaradas. Sem rótulos psicológicos. */

export const PCAR_AREAS = [
  'comercial',
  'industrial',
  'supermercados',
  'climatizacao',
  'manutencao',
  'projetos',
  'automacao',
  'eletricidade',
  'comandos',
  'outro',
] as const;

const AREA_ALIASES: Record<string, (typeof PCAR_AREAS)[number]> = {
  comercial: 'comercial',
  industrial: 'industrial',
  supermercados: 'supermercados',
  climatizacao: 'climatizacao',
  climatização: 'climatizacao',
  manutencao: 'manutencao',
  manutenção: 'manutencao',
  projetos: 'projetos',
  automacao: 'automacao',
  automação: 'automacao',
  eletricidade: 'eletricidade',
  eletrica: 'eletricidade',
  elétrica: 'eletricidade',
  'comandos eletricos': 'comandos',
  'comandos elétricos': 'comandos',
  comandos: 'comandos',
  outro: 'outro',
};

export function normalizePcarArea(raw: string): (typeof PCAR_AREAS)[number] | null {
  const key = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  return AREA_ALIASES[key] ?? null;
}

export const PCAR_EXPLANATION = ['visual', 'pratico', 'textual'] as const;
export const PCAR_COMFORT = ['baixa', 'media', 'alta'] as const;

export const CAREER_GOALS = [
  'primeiro_emprego',
  'melhorar_qualificacao',
  'aumentar_salario',
  'abrir_empresa',
  'refrigeracao_comercial',
  'refrigeracao_industrial',
  'supermercados',
  'co2',
  'climatizacao',
  'projetos',
  'manutencao',
  'automacao',
  'consultoria',
  'gestao',
  'outro',
] as const;

export type PcarProfile = {
  experienceYears: number;
  areas: string[];
  technicalFamiliarity: 'iniciante' | 'operacional' | 'avancado';
  confidenceByDomain: Record<string, number>;
  explanationPreference: (typeof PCAR_EXPLANATION)[number];
  mathComfort: (typeof PCAR_COMFORT)[number];
  readingComfort: (typeof PCAR_COMFORT)[number];
  problemSolvingComfort: (typeof PCAR_COMFORT)[number];
  schematicExperience: boolean;
  studyAvailabilityHoursPerWeek: number;
  specialtyInterests: string[];
};

const CLINICAL =
  /\b(tdah|autismo|ansiedade|depress[aã]o|transtorno|qi\b|intelig[eê]ncia cl[ií]nica|personalidade|diagn[oó]stico psicol)/i;

export function sanitizePcar(raw: Record<string, unknown>): PcarProfile {
  const years = clampNum(raw.experienceYears, 0, 50);
  const areas = [
    ...new Set(
      asList(raw.areas)
        .map((a) => normalizePcarArea(a))
        .filter((a): a is (typeof PCAR_AREAS)[number] => a != null && a !== 'outro'),
    ),
  ];
  const familiarity =
    raw.technicalFamiliarity === 'operacional' || raw.technicalFamiliarity === 'avancado'
      ? raw.technicalFamiliarity
      : 'iniciante';
  const confidenceByDomain: Record<string, number> = {};
  if (raw.confidenceByDomain && typeof raw.confidenceByDomain === 'object') {
    for (const [k, v] of Object.entries(raw.confidenceByDomain as Record<string, unknown>)) {
      if (!CLINICAL.test(k)) confidenceByDomain[k] = clampNum(v, 0, 100);
    }
  }
  return {
    experienceYears: years,
    areas: areas.length ? areas : ['outro'],
    technicalFamiliarity: familiarity,
    confidenceByDomain,
    explanationPreference: pick(raw.explanationPreference, PCAR_EXPLANATION, 'pratico'),
    mathComfort: pick(raw.mathComfort, PCAR_COMFORT, 'media'),
    readingComfort: pick(raw.readingComfort, PCAR_COMFORT, 'media'),
    problemSolvingComfort: pick(raw.problemSolvingComfort, PCAR_COMFORT, 'media'),
    schematicExperience: raw.schematicExperience === true,
    studyAvailabilityHoursPerWeek: clampNum(raw.studyAvailabilityHoursPerWeek, 0, 80),
    specialtyInterests: asList(raw.specialtyInterests).slice(0, 12),
  };
}

export function sanitizeCareerGoals(
  raw: unknown,
  freeText?: unknown,
): {
  goals: string[];
  notes: string | null;
} {
  const list = asList(raw).filter((g) => (CAREER_GOALS as readonly string[]).includes(g));
  let notes = typeof freeText === 'string' ? freeText.trim().slice(0, 500) : null;
  if (notes && CLINICAL.test(notes)) notes = null;
  return { goals: list.length ? list : ['melhorar_qualificacao'], notes };
}

function clampNum(v: unknown, min: number, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function asList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}
