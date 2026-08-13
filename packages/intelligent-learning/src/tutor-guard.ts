import type { SchoolKey } from './schools';
import { tutorAllowedContextKeys } from './student-360';

const ANSWER_SEEKING =
  /\b(gabarito|resposta certa|alternativa correta|alternativa\s+[a-e]\b|qual (é|e|é) a resposta|me (diz|diga|fale|passa) (a )?resposta|resolv\w*( (a|esta|essa))? quest|answer key|correct option|qual op[cç][aã]o|op[cç][aã]o (devo|certa)|devo marcar)\b/i;

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

const SCHOOL_IDENTITY_Q =
  /\b(em qual escola( eu)? estou|qual (e|é) (a )?minha escola|qual escola|onde (eu )?estudo|em que escola)\b/i;

/** Resposta determinística de identidade escolar — não depende de Retrieval. */
export function answerSchoolIdentityQuestion(
  question: string,
  schoolKey: SchoolKey | null,
): { text: string; schoolKey: SchoolKey | null; source: 'brand-context' } | null {
  if (!SCHOOL_IDENTITY_Q.test(question.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
    return null;
  }
  if (schoolKey === 'fred-do-frio') {
    return {
      text: 'Você está no ambiente Fred do Frio. Este tutor responde apenas no contexto autorizado desta escola e não mistura cursos ou catálogo CTE.',
      schoolKey,
      source: 'brand-context',
    };
  }
  if (schoolKey === 'cte') {
    return {
      text: 'Você está no ambiente CTE. Este tutor responde apenas no contexto autorizado desta escola e não mistura cursos ou catálogo Fred do Frio.',
      schoolKey,
      source: 'brand-context',
    };
  }
  return {
    text: 'Não há escola educacional autenticada neste contexto. Não posso atribuir Fred do Frio ou CTE sem evidência.',
    schoolKey: null,
    source: 'brand-context',
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
