import type { SchoolKey } from './schools';
import { tutorAllowedContextKeys } from './student-360';

const ANSWER_SEEKING =
  /\b(gabarito|resposta certa|alternativa correta|qual (é|e) a resposta|me (diz|fale|passa) a resposta|resolve(r)? (a|esta|essa) quest|answer key|correct option)\b/i;

export type AssessmentGuardInput = {
  question: string;
  officialAssessmentActive: boolean;
  schoolKey?: SchoolKey | null;
  sipSummary?: string | null;
};

export type AssessmentGuardResult = {
  blocked: boolean;
  reason: string | null;
  safeQuestion: string;
  systemPolicy: string;
  allowedContextKeys: string[];
};

const POLICY_ACTIVE = [
  'ASSESSMENT_CONTEXT_GUARD=ON',
  'Não fornecer resposta, alternativa correta, gabarito ou resolução da questão ativa.',
  'Pode explicar o conceito geral da disciplina sem resolver o item.',
  'Pode explicar regras da prova e suporte técnico da plataforma.',
  'Se o aluno pedir a resposta, recusar e redirecionar ao conteúdo conceitual.',
].join(' ');

const POLICY_IDLE =
  'ASSESSMENT_CONTEXT_GUARD=OFF. Pode apoiar o estudo com o contexto educacional mínimo autorizado.';

export function applyAssessmentGuard(input: AssessmentGuardInput): AssessmentGuardResult {
  const allowedContextKeys = tutorAllowedContextKeys();
  if (!input.officialAssessmentActive) {
    return {
      blocked: false,
      reason: null,
      safeQuestion: input.question,
      systemPolicy: POLICY_IDLE,
      allowedContextKeys,
    };
  }
  const seeking = ANSWER_SEEKING.test(input.question);
  return {
    blocked: seeking,
    reason: seeking ? 'ASSESSMENT_ANSWER_REQUEST' : null,
    safeQuestion: seeking
      ? 'O aluno pediu a resposta de uma avaliação oficial. Explique apenas o conceito geral, sem resolver o item e sem citar alternativas.'
      : input.question,
    systemPolicy: POLICY_ACTIVE,
    allowedContextKeys,
  };
}

export function schoolAiContext(schoolKey: SchoolKey | null): string {
  if (schoolKey === 'cte') {
    return 'SCHOOL_CONTEXT=CTE. Responda no contexto da escola CTE. Não atribua cursos ou catálogo Fred do Frio.';
  }
  if (schoolKey === 'fred-do-frio') {
    return 'SCHOOL_CONTEXT=FRED_DO_FRIO. Responda no contexto Fred do Frio. Não atribua cursos ou catálogo CTE.';
  }
  return 'SCHOOL_CONTEXT=OMNIA_LMS';
}

export function filterTutorContext<T extends Record<string, unknown>>(raw: T): Partial<T> {
  const allow = new Set(tutorAllowedContextKeys());
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (allow.has(k)) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
