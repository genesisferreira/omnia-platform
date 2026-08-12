import type { GuardDecision, ProfileKind } from '../domain/types';

const INTEGRITY_MESSAGE =
  'Posso ajudar revisando o conceito e indicando onde estudar. Não forneço gabarito, alternativa correta nem solução direta de atividade avaliativa.';

const ASSESSMENT_PATTERNS = [
  /\bgabarito\b/i,
  /\bresposta\s+(da|do|correta)\s+(quest[aã]o|prova|quiz)\b/i,
  /\balternativa\s+correta\b/i,
  /\bprova\b.*\b(resposta|gabarito|nota)\b/i,
  /\bquiz\b.*\b(resposta|gabarito)\b/i,
  /\batividade\s+avaliativa\b/i,
  /\bme\s+passa\s+a\s+resposta\b/i,
  /\bqual\s+[eé]\s+a\s+resposta\s+da\s+quest/i,
];

/**
 * Assessment Integrity — aplica a todos os agentes.
 * Professores/admin podem estruturar avaliações (assessor), mas alunos nunca recebem gabarito.
 */
export function evaluateAssessmentIntegrity(input: {
  question: string;
  profile: ProfileKind;
  assistantKey?: string | null;
}): GuardDecision & { triggered: boolean } {
  const hit = ASSESSMENT_PATTERNS.some((re) => re.test(input.question));
  if (!hit) return { allow: true, triggered: false };

  const teacherish =
    input.profile === 'teacher' || input.profile === 'admin' || input.profile === 'super_admin';

  // Professor no Avaliador pode pedir ajuda para estruturar — não pedir gabarito do aluno.
  if (teacherish && input.assistantKey === 'assessor') {
    if (/\bgabarito\s+do\s+aluno\b/i.test(input.question)) {
      return {
        allow: false,
        code: 'ASSESSMENT_INTEGRITY',
        message: INTEGRITY_MESSAGE,
        event: 'ai.assessment_integrity.triggered',
        triggered: true,
      };
    }
    return { allow: true, triggered: true };
  }

  return {
    allow: false,
    code: 'ASSESSMENT_INTEGRITY',
    message: INTEGRITY_MESSAGE,
    event: 'ai.assessment_integrity.triggered',
    triggered: true,
  };
}
