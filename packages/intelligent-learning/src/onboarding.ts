export const ONBOARDING_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'REVIEW_REQUIRED',
  'EXEMPTED',
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const ONBOARDING_STEPS = [
  'explanation',
  'consent',
  'pcar',
  'goals',
  'assessment',
  'result',
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function isOnboardingStatus(value: unknown): value is OnboardingStatus {
  return ONBOARDING_STATUSES.includes(value as OnboardingStatus);
}

export function academicAccessAllowed(status: OnboardingStatus | null | undefined): boolean {
  return status === 'COMPLETED' || status === 'EXEMPTED';
}

const GATED_ALLOW = [
  '/aluno/onboarding',
  '/aluno/privacidade',
  '/login',
  '/logout',
  '/api/auth',
  '/unauthorized',
];

/** Paths permitidos enquanto o gate de first-login está ativo (aluno). */
export function isAllowedWhileGated(path: string): boolean {
  const p = path.split('?')[0] || '/';
  if (GATED_ALLOW.some((a) => p === a || p.startsWith(`${a}/`))) return true;
  if (p.startsWith('/api/academic/ils/')) return true;
  if (p.startsWith('/api/academic/onboarding')) return true;
  return false;
}

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return ONBOARDING_STEPS.includes(value as OnboardingStep);
}

export function coerceOnboardingStep(
  value: unknown,
  fallback: OnboardingStep = 'explanation',
): OnboardingStep {
  return isOnboardingStep(value) ? value : fallback;
}

export function hasPcarProfile(pcar: unknown): boolean {
  if (!pcar || typeof pcar !== 'object' || Array.isArray(pcar)) return false;
  const row = pcar as Record<string, unknown>;
  const years = typeof row.experienceYears === 'number';
  const areas = Array.isArray(row.areas)
    ? row.areas.filter((a) => typeof a === 'string' && a.trim())
    : [];
  return years || areas.length > 0;
}

export function hasGoalsProfile(goals: unknown): boolean {
  if (!goals || typeof goals !== 'object' || Array.isArray(goals)) return false;
  const raw = (goals as { goals?: unknown }).goals;
  const list = Array.isArray(raw) ? raw.filter((g) => typeof g === 'string' && g.trim()) : [];
  return list.length > 0;
}

export function hasCompletedInitialAssessment(assessmentState: unknown): boolean {
  if (!assessmentState || typeof assessmentState !== 'object' || Array.isArray(assessmentState)) {
    return false;
  }
  const state = assessmentState as { complete?: unknown; answers?: unknown };
  const answers = Array.isArray(state.answers) ? state.answers : [];
  return state.complete === true && answers.length > 0;
}

export function pickOnboardingRecord<T extends { schoolKey?: unknown }>(
  rows: T[],
  schoolKey: string | null,
): T | undefined {
  if (schoolKey) {
    const exact = rows.find((row) => row.schoolKey === schoolKey);
    if (exact) return exact;
    return rows.find((row) => row.schoolKey == null || row.schoolKey === '');
  }
  return rows[0];
}

export function nextOnboardingStep(input: {
  status: OnboardingStatus;
  hasConsent: boolean;
  hasPcar: boolean;
  hasGoals: boolean;
  hasAssessment: boolean;
}): OnboardingStep {
  if (input.status === 'COMPLETED' || input.status === 'EXEMPTED') return 'result';
  if (!input.hasConsent) return input.status === 'NOT_STARTED' ? 'explanation' : 'consent';
  if (!input.hasPcar) return 'pcar';
  if (!input.hasGoals) return 'goals';
  if (!input.hasAssessment) return 'assessment';
  return 'result';
}

/** Copy shown at first-login. Must stay conversational — not a form. */
export function onboardingWelcomePrompt(schoolName: string | null | undefined): string {
  const school = schoolName || 'sua escola';
  return `Olá. Bem-vindo(a) ao ${school}.\n\nAntes de liberar sua área de estudos, quero conhecer um pouco da sua experiência e dos seus objetivos.\n\nIsso não é uma prova para aprovar ou reprovar você. Vou usar suas respostas para adaptar conteúdos, exercícios e o acompanhamento durante sua formação.\n\nPodemos começar?`;
}

export const ONBOARDING_CONSENT_PROMPT =
  'Perfeito. Para seguir, preciso do seu consentimento educacional. Seus dados serão usados só para adaptar a formação. Você concorda?';

export const ONBOARDING_PCAR_PROMPT =
  'Obrigado. Me conte: você já trabalha com refrigeração? Se sim, em qual área (comercial, industrial, HVAC, elétrica/comandos) e há quanto tempo aproximadamente?';

export const ONBOARDING_GOALS_PROMPT =
  'Entendi. Quais são seus objetivos principais nesta formação? Por exemplo: melhorar qualificação, operar câmaras, avançar em comandos elétricos…';

export const ONBOARDING_ASSESSMENT_INTRO_PROMPT =
  'Agora vou fazer algumas perguntas técnicas adaptativas — curtas, uma de cada vez. Não é eliminatório. Digite “Iniciar questões” quando estiver pronto.';

export const ONBOARDING_GENERIC_FALLBACK =
  'Pode continuar — estou acompanhando seu onboarding. Se preferir, use um dos atalhos abaixo.';

export function assistantPromptForOnboardingStep(
  step: OnboardingStep,
  input: { schoolName?: string | null; questionPrompt?: string | null; domainLabel?: string | null } = {},
): string {
  if (step === 'explanation') return onboardingWelcomePrompt(input.schoolName);
  if (step === 'consent') return ONBOARDING_CONSENT_PROMPT;
  if (step === 'pcar') return ONBOARDING_PCAR_PROMPT;
  if (step === 'goals') return ONBOARDING_GOALS_PROMPT;
  if (step === 'assessment') {
    if (input.questionPrompt) {
      return `${input.domainLabel || 'Questão'}\n\n${input.questionPrompt}\n\nResponda Verdadeiro ou Falso.`;
    }
    return ONBOARDING_ASSESSMENT_INTRO_PROMPT;
  }
  return 'Perfil inicial pronto. Sua área acadêmica foi liberada.';
}

export function isOnboardingAffirmative(text: string): boolean {
  const n = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (!n) return false;
  if (/^(sim|si|yes|ok|okay|claro|pode|vamos)\b/.test(n)) return true;
  if (n.includes('vamos comecar') || n.includes('sim, vamos')) return true;
  if (n.includes('concordo')) return true;
  return n === 's';
}

export function pcarDraftFromUtterance(text: string): Record<string, unknown> {
  const lower = text.toLowerCase();
  const beginner = /come[cç]ando|nunca|n[aã]o trabalho|estou começando/.test(lower);
  const electrical = /el[eé]tric|comando|hvac/.test(lower);
  return {
    experienceYears: beginner ? 0 : 3,
    areas: electrical ? ['eletricidade', 'comandos elétricos'] : ['comercial'],
    technicalFamiliarity: beginner ? 'iniciante' : 'operacional',
    explanationPreference: 'pratico',
    mathComfort: 'media',
    readingComfort: 'media',
    problemSolvingComfort: 'media',
    schematicExperience: !beginner,
    studyAvailabilityHoursPerWeek: 6,
    notes: text,
  };
}

export function goalsDraftFromUtterance(text: string): { goals: string[]; notes: string } {
  const lower = text.toLowerCase();
  const goals = [/qualifica/.test(lower) ? 'melhorar_qualificacao' : 'refrigeracao_comercial'];
  return { goals, notes: text };
}

export type OnboardingTurnAction =
  | 'start'
  | 'consent'
  | 'pcar'
  | 'goals'
  | 'assessment_next'
  | 'assessment_answer'
  | 'recover_complete'
  | 'noop'
  | 'validate';

export type OnboardingTurnPlan = {
  action: OnboardingTurnAction;
  validationMessage?: string;
  answerValue?: 'true' | 'false';
};

/**
 * Interprets a student utterance against the canonical step.
 * Never maps a valid "sim" onto the generic fallback.
 */
export function planOnboardingTurn(input: {
  currentStep: unknown;
  status: OnboardingStatus;
  academicAllowed: boolean;
  text: string;
  hasAssessmentQuestion: boolean;
}): OnboardingTurnPlan {
  const text = input.text.trim();
  const lower = text.toLowerCase();
  const step = coerceOnboardingStep(input.currentStep, 'explanation');

  if (input.academicAllowed) return { action: 'noop' };
  if (!text) {
    return { action: 'validate', validationMessage: 'Escreva uma resposta para continuarmos.' };
  }

  if (step === 'explanation') {
    if (isOnboardingAffirmative(text)) return { action: 'start' };
    return {
      action: 'validate',
      validationMessage: 'Responda “sim” para começarmos. Isso não é uma prova.',
    };
  }

  if (step === 'consent') {
    if (isOnboardingAffirmative(text)) return { action: 'consent' };
    return {
      action: 'validate',
      validationMessage: 'Para continuar, preciso da sua concordância educacional. Responda “sim” ou “concordo”.',
    };
  }

  if (step === 'pcar') return { action: 'pcar' };
  if (step === 'goals') return { action: 'goals' };

  if (step === 'assessment') {
    if (!input.hasAssessmentQuestion) return { action: 'assessment_next' };
    if (/falso|false/.test(lower) || /^(n[aã]o|nao)\b/.test(lower)) {
      return { action: 'assessment_answer', answerValue: 'false' };
    }
    if (/verdadeiro|true/.test(lower) || isOnboardingAffirmative(text)) {
      return { action: 'assessment_answer', answerValue: 'true' };
    }
    return {
      action: 'validate',
      validationMessage: 'Responda Verdadeiro ou Falso para a questão atual.',
    };
  }

  if (step === 'result') return { action: 'recover_complete' };

  if (isOnboardingAffirmative(text)) return { action: 'start' };
  return {
    action: 'validate',
    validationMessage: 'Não consegui usar essa resposta. Tente de novo com suas próprias palavras.',
  };
}

export function appendUniqueDiagnosticAnswer(
  answers: Array<{ questionId: string; correct: boolean }>,
  next: { questionId: string; correct: boolean },
): { answers: Array<{ questionId: string; correct: boolean }>; duplicate: boolean } {
  const last = answers[answers.length - 1];
  if (last?.questionId === next.questionId) return { answers, duplicate: true };
  return { answers: [...answers, next], duplicate: false };
}

export function applyOnboardingTransition(
  current: OnboardingStatus,
  action: 'start' | 'complete' | 'review' | 'exempt',
): OnboardingStatus {
  if (action === 'exempt') return 'EXEMPTED';
  if (action === 'complete') return 'COMPLETED';
  if (action === 'review') return 'REVIEW_REQUIRED';
  if (current === 'NOT_STARTED' || current === 'REVIEW_REQUIRED') return 'IN_PROGRESS';
  return current;
}

export function requireOverrideReason(reason: unknown): string {
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < 8) {
    throw new Error('OVERRIDE_REASON_REQUIRED');
  }
  return text;
}
