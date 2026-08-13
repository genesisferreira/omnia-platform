/** Avaliação inicial adaptativa + blueprint oficial. Scoring determinístico — LLM não fecha nota. */

export const TECHNICAL_DOMAINS = [
  'fundamentos',
  'comercial',
  'industrial',
  'eletricidade',
  'comandos',
  'termodinamica',
  'leitura_tecnica',
  'diagnostico',
  'seguranca',
] as const;
export type TechnicalDomain = (typeof TECHNICAL_DOMAINS)[number];

export const DOMAIN_LABELS: Record<TechnicalDomain, string> = {
  fundamentos: 'Fundamentos de refrigeração',
  comercial: 'Refrigeração comercial',
  industrial: 'Refrigeração industrial',
  eletricidade: 'Eletricidade',
  comandos: 'Comandos elétricos',
  termodinamica: 'Termodinâmica',
  leitura_tecnica: 'Leitura e interpretação técnica',
  diagnostico: 'Diagnóstico',
  seguranca: 'Segurança',
};

export type AdaptiveDifficulty = 1 | 2 | 3;

export type BankQuestion = {
  id: string;
  domain: TechnicalDomain;
  difficulty: AdaptiveDifficulty;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
};

export type DomainEstimate = {
  domain: TechnicalDomain;
  score: number;
  confidence: number;
  evidenceCount: number;
  done: boolean;
};

export function nextAdaptiveQuestion(
  bank: BankQuestion[],
  answers: Array<{ questionId: string; correct: boolean }>,
): { question: BankQuestion | null; estimates: DomainEstimate[]; complete: boolean } {
  const estimates = TECHNICAL_DOMAINS.map((domain) => estimateDomain(domain, bank, answers));
  const open = estimates.find((e) => !e.done);
  if (!open) return { question: null, estimates, complete: true };

  const used = new Set(answers.map((a) => a.questionId));
  const last = answers
    .slice()
    .reverse()
    .map((a) => bank.find((q) => q.id === a.questionId))
    .find((q) => q?.domain === open.domain);
  let target: AdaptiveDifficulty = 2;
  if (last) {
    const lastAns = answers.filter((a) => a.questionId === last.id).at(-1);
    if (lastAns?.correct) target = Math.min(3, last.difficulty + 1) as AdaptiveDifficulty;
    else target = Math.max(1, last.difficulty - 1) as AdaptiveDifficulty;
  }

  const pool = bank.filter((q) => q.domain === open.domain && !used.has(q.id));
  const question =
    pool.find((q) => q.difficulty === target) ||
    pool.find((q) => Math.abs(q.difficulty - target) === 1) ||
    pool[0] ||
    null;
  if (!question) {
    open.done = true;
    const leftover = estimates.find((e) => !e.done);
    return leftover
      ? nextAdaptiveQuestion(bank, answers)
      : { question: null, estimates, complete: true };
  }
  return { question, estimates, complete: false };
}

export function estimateDomain(
  domain: TechnicalDomain,
  bank: BankQuestion[],
  answers: Array<{ questionId: string; correct: boolean }>,
): DomainEstimate {
  const items = answers
    .map((a) => {
      const q = bank.find((b) => b.id === a.questionId);
      return q?.domain === domain ? { ...a, difficulty: q.difficulty } : null;
    })
    .filter((x): x is { questionId: string; correct: boolean; difficulty: AdaptiveDifficulty } =>
      Boolean(x),
    );
  const evidenceCount = items.length;
  if (!evidenceCount) {
    return { domain, score: 50, confidence: 0, evidenceCount: 0, done: false };
  }
  const earned = items.reduce((s, i) => s + (i.correct ? i.difficulty : 0), 0);
  const max = items.reduce((s, i) => s + i.difficulty, 0);
  const score = max > 0 ? Math.round((100 * earned) / max) : 0;
  const confidence = Math.min(1, evidenceCount / 3);
  const lastTwo = items.slice(-2);
  const stable = lastTwo.length === 2 && lastTwo[0]!.correct === lastTwo[1]!.correct;
  const done = evidenceCount >= 3 || (evidenceCount >= 2 && stable);
  return { domain, score, confidence, evidenceCount, done };
}

export function overallTechnicalLevel(estimates: DomainEstimate[]): {
  overall: number;
  confidence: number;
  evidenceCount: number;
  label: 'iniciante' | 'operacional' | 'avancado';
} {
  const ready = estimates.filter((e) => e.evidenceCount > 0);
  const evidenceCount = ready.reduce((s, e) => s + e.evidenceCount, 0);
  if (!ready.length) {
    return { overall: 0, confidence: 0, evidenceCount: 0, label: 'iniciante' };
  }
  const overall = Math.round(
    ready.reduce((s, e) => s + e.score * Math.max(0.25, e.confidence), 0) /
      ready.reduce((s, e) => s + Math.max(0.25, e.confidence), 0),
  );
  const confidence =
    ready.reduce((s, e) => s + e.confidence, 0) / Math.max(1, TECHNICAL_DOMAINS.length);
  const label = overall >= 75 ? 'avancado' : overall >= 45 ? 'operacional' : 'iniciante';
  return { overall, confidence: Number(confidence.toFixed(3)), evidenceCount, label };
}

export type BlueprintCompetency = { key: string; weight: number };
export type Blueprint = {
  version: string;
  competencies: BlueprintCompetency[];
  difficulty: { beginner: number; intermediate: number; advanced: number };
  questionCount: number;
  timeLimitMinutes: number;
  passingScore: number;
  allowedTypes: string[];
};

export function validateBlueprint(bp: Blueprint): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const w = bp.competencies.reduce((s, c) => s + c.weight, 0);
  if (Math.abs(w - 100) > 0.01) errors.push('WEIGHTS_MUST_SUM_100');
  const d = bp.difficulty.beginner + bp.difficulty.intermediate + bp.difficulty.advanced;
  if (Math.abs(d - 100) > 0.01) errors.push('DIFFICULTY_MUST_SUM_100');
  if (bp.questionCount < 1 || bp.questionCount > 80) errors.push('QUESTION_COUNT');
  if (bp.passingScore < 0 || bp.passingScore > 100) errors.push('PASSING_SCORE');
  if (!bp.allowedTypes.length) errors.push('ALLOWED_TYPES');
  if (!bp.version.trim()) errors.push('VERSION');
  return { ok: errors.length === 0, errors };
}

/** Equivalência V1 = mesmo blueprint/version + pesos e distribuição iguais (não estatística). */
export function blueprintsEquivalent(a: Blueprint, b: Blueprint): boolean {
  if (a.version !== b.version) return false;
  if (a.questionCount !== b.questionCount) return false;
  if (JSON.stringify(sortComp(a.competencies)) !== JSON.stringify(sortComp(b.competencies))) {
    return false;
  }
  return (
    a.difficulty.beginner === b.difficulty.beginner &&
    a.difficulty.intermediate === b.difficulty.intermediate &&
    a.difficulty.advanced === b.difficulty.advanced
  );
}

function sortComp(list: BlueprintCompetency[]) {
  return [...list].sort((x, y) => x.key.localeCompare(y.key));
}
