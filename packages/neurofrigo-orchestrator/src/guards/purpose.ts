import type { GuardDecision, ProfileKind } from '../domain/types';

const PURPOSE_DENY =
  'Posso ajudar apenas com assuntos do ecossistema Omnia (cursos, refrigeração, Neurofrigo, suporte acadêmico e serviços relacionados). Reformule sua pergunta dentro desse escopo.';

const PERSONAL_AI_PATTERNS = [
  /\bchatgpt\b/i,
  /\bia\s+pessoal\b/i,
  /\bescreva\s+(um\s+)?(poema|redação|trabalho\s+de\s+escola)\b/i,
  /\bcodigo\s+(em\s+)?(python|javascript|java)\s+(para\s+)?(jogo|hack)\b/i,
  /\bignora(r)?\s+(suas\s+)?(regras|instru[cç][oõ]es)\b/i,
  /\bact\s+as\s+(if\s+you\s+are\s+)?chatgpt\b/i,
  /\brecibo\s+de\s+imposto\b/i,
  /\bnamorad[oa]\b/i,
];

const IN_SCOPE_HINTS = [
  /\bcurs/i,
  /\baula/i,
  /\bm[oó]dulo/i,
  /\brefrigera/i,
  /\bhvac/i,
  /\bneurofrigo\b/i,
  /\bomnia/i,
  /\bcompress/i,
  /\bevapor/i,
  /\bcondens/i,
  /\bel[eé]tric/i,
  /\bclp\b/i,
  /\binversor/i,
  /\bmatri/i,
  /\bprova\b/i,
  /\bavalia/i,
  /\bestud/i,
  /\btutor/i,
  /\blaborat/i,
  /\bparceir/i,
  /\bsuporte/i,
  /\bcomercial/i,
  /\bproposta/i,
  /\brenova[cç]/i,
  /\bfred\b/i,
  /\bcte\b/i,
  /\befici[eê]ncia/i,
  /\bservi[cç]o/i,
  /\becossistema/i,
  /\bempresa/i,
  /\bcontato/i,
];

export function normalizeProfile(role?: string | null): ProfileKind {
  const r = (role || 'visitor').toLowerCase();
  if (r === 'super_admin') return 'super_admin';
  if (r === 'admin' || r === 'publisher') return 'admin';
  if (r === 'teacher' || r === 'instructor') return 'teacher';
  if (r === 'partner') return 'partner';
  if (r === 'company' || r === 'empresa') return 'company';
  if (r === 'student' || r === 'aluno') return 'student';
  if (r === 'anonymous' || r === 'visitor' || r === 'visitante') return 'visitor';
  return 'visitor';
}

/**
 * Purpose Guard — bloqueia uso como IA pessoal genérica.
 * Super_admin tem escopo maior, mas ainda não revela secrets.
 */
export function evaluatePurposeGuard(input: {
  question: string;
  profile: ProfileKind;
}): GuardDecision {
  const q = input.question.trim();
  if (!q) {
    return {
      allow: false,
      code: 'EMPTY_QUESTION',
      message: 'Envie uma pergunta para continuar.',
      event: 'ai.purpose_guard.triggered',
    };
  }

  for (const re of PERSONAL_AI_PATTERNS) {
    if (re.test(q)) {
      // super_admin ainda não pode pedir para ignorar regras de segurança
      if (input.profile === 'super_admin' && /ignora|ignore/i.test(q)) {
        return {
          allow: false,
          code: 'PURPOSE_DENY_SECURITY',
          message: PURPOSE_DENY,
          event: 'ai.purpose_guard.triggered',
        };
      }
      if (input.profile !== 'super_admin') {
        return {
          allow: false,
          code: 'PURPOSE_DENY_PERSONAL_AI',
          message: PURPOSE_DENY,
          event: 'ai.purpose_guard.triggered',
        };
      }
    }
  }

  const hasScopeHint = IN_SCOPE_HINTS.some((re) => re.test(q));
  const looksGenericProgramming =
    /\b(escreva|gere|crie)\b.*\b(c[oó]digo|script|app)\b/i.test(q) && !hasScopeHint;

  if (looksGenericProgramming && input.profile !== 'super_admin') {
    return {
      allow: false,
      code: 'PURPOSE_DENY_OFF_ECOSYSTEM',
      message: PURPOSE_DENY,
      event: 'ai.purpose_guard.triggered',
    };
  }

  return { allow: true };
}
