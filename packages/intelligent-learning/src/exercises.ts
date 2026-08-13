export const EXERCISE_STATUSES = ['GENERATED', 'VALIDATED', 'AVAILABLE', 'REJECTED'] as const;
export type ExerciseStatus = (typeof EXERCISE_STATUSES)[number];

export const EXERCISE_TYPES = [
  'multiple_choice',
  'true_false',
  'short_answer',
  'diagnostic_case',
  'calculation',
] as const;

export type GeneratedExercise = {
  exerciseId: string;
  competencies: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: (typeof EXERCISE_TYPES)[number];
  prompt: string;
  expectedAnswer: string | null;
  rubric: string | null;
  explanation: string | null;
  sourceRefs: string[];
  generationMetadata: {
    model?: string | null;
    classification?: GeneratorClassification;
    schoolKey: string | null;
    studentId?: number | null;
    courseId?: number | null;
    lessonId?: number | null;
  };
  status: ExerciseStatus;
};

export function validateGeneratedExercise(ex: GeneratedExercise): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!ex.prompt.trim() || ex.prompt.trim().length < 12) errors.push('PROMPT');
  if (!ex.competencies.length) errors.push('COMPETENCIES');
  if (!EXERCISE_TYPES.includes(ex.type)) errors.push('TYPE');
  if (ex.type !== 'diagnostic_case' && !ex.expectedAnswer && !ex.rubric) {
    errors.push('ANSWER_OR_RUBRIC');
  }
  if (ex.prompt.toLowerCase().includes('lorem ipsum')) errors.push('PLACEHOLDER');
  return { ok: errors.length === 0, errors };
}

export function promoteExercise(
  status: ExerciseStatus,
  action: 'validate' | 'publish' | 'reject',
): ExerciseStatus {
  if (action === 'reject') return 'REJECTED';
  if (action === 'validate' && status === 'GENERATED') return 'VALIDATED';
  if (action === 'publish' && status === 'VALIDATED') return 'AVAILABLE';
  return status;
}

/** Exercício GENERATED não entra em prova oficial. */
export function canUseInOfficialAssessment(status: ExerciseStatus): boolean {
  return status === 'AVAILABLE' || status === 'VALIDATED';
}

export type GeneratorClassification = 'RULE_GENERATED' | 'AI_GENERATED';

const RULE_TEMPLATES: Record<
  string,
  { prompt: string; expectedAnswer: string; rubric: string; sourceRefs: string[] }
> = {
  termodinamica: {
    prompt:
      'Explique o superquecimento no evaporador: o que mede, onde se lê e por que um valor baixo indica risco de retorno de líquido.',
    expectedAnswer:
      'Superquecimento é a diferença entre a temperatura do vapor na saída do evaporador e a temperatura de saturação da pressão de evaporação. Valor baixo indica líquido próximo da sucção.',
    rubric: 'Citar definição, ponto de medição e risco operacional. Sem diagnóstico clínico.',
    sourceRefs: ['lms:fundamentos-refrigeracao-industrial', 'domain:termodinamica'],
  },
  eletricidade: {
    prompt:
      'Em um quadro de comando de câmara fria, descreva a função do disjuntor motor e o risco de operar com sobrecarga sem proteção térmica.',
    expectedAnswer:
      'O disjuntor motor protege contra curto e sobrecarga. Sem proteção térmica o motor pode aquecer além do isolante e falhar.',
    rubric: 'Citar proteção elétrica e consequência operacional. Sem rótulo de capacidade mental.',
    sourceRefs: ['lms:cte-normas-eletricas-industriais', 'domain:eletricidade'],
  },
  fundamentos: {
    prompt:
      'Liste os quatro componentes principais do ciclo de compressão a vapor e a função de cada um em uma frase.',
    expectedAnswer:
      'Compressor (eleva pressão), condensador (rejeita calor), dispositivo de expansão (queda de pressão), evaporador (absorve calor).',
    rubric: 'Quatro componentes + função. Linguagem operacional.',
    sourceRefs: ['lms:fundamentos-refrigeracao-industrial', 'domain:fundamentos'],
  },
};

function fallbackRuleTemplate(competencyKey: string) {
  return {
    prompt: `Descreva, em linguagem operacional, o conceito de ${competencyKey} e um cuidado prático em planta.`,
    expectedAnswer: `Definição operacional de ${competencyKey} + um risco ou boa prática associada.`,
    rubric: `Exigir conceito + aplicação. Competência alvo: ${competencyKey}.`,
    sourceRefs: [`domain:${competencyKey}`],
  };
}

/** Motor V1.1: template/regra determinístico. Não declara LLM. */
export function ruleGenerateExercise(input: {
  competencyKey: string;
  difficulty?: GeneratedExercise['difficulty'];
  type?: GeneratedExercise['type'];
  schoolKey?: string | null;
  studentId?: number | null;
  courseId?: number | null;
  lessonId?: number | null;
}): GeneratedExercise {
  const key = input.competencyKey.trim().toLowerCase() || 'fundamentos';
  const tpl = RULE_TEMPLATES[key] ?? fallbackRuleTemplate(key);
  const difficulty = input.difficulty ?? 'beginner';
  return {
    exerciseId: `rule-${key}-${difficulty}`,
    competencies: [key],
    difficulty,
    type: input.type ?? 'short_answer',
    prompt: tpl.prompt,
    expectedAnswer: tpl.expectedAnswer,
    rubric: tpl.rubric,
    explanation: `RULE_GENERATED · competência ${key} · dificuldade ${difficulty}`,
    sourceRefs: tpl.sourceRefs,
    generationMetadata: {
      model: 'rule-template-v1',
      classification: 'RULE_GENERATED',
      schoolKey: input.schoolKey ?? null,
      studentId: input.studentId ?? null,
      courseId: input.courseId ?? null,
      lessonId: input.lessonId ?? null,
    },
    status: 'GENERATED',
  };
}

export function generatorClassification(): GeneratorClassification {
  return 'RULE_GENERATED';
}

export function reinforcementPlan(input: {
  competencyKey: string;
  score: number;
  lessonHint?: string | null;
}): { content: string; exerciseFocus: string; note: string } {
  return {
    content: input.lessonHint || `Revisar conteúdo de ${input.competencyKey}`,
    exerciseFocus: `Exercício formativo em ${input.competencyKey} (não altera nota oficial).`,
    note: `Domínio atual ${input.score}. Atividade adaptativa é formativa.`,
  };
}
