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
