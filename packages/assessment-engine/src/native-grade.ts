/**
 * Native Omnia assessment grading (LMS Core).
 * Does not write Moodle. Does not mutate official gradebook ownership.
 */

export type NativeQuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';

export type NativeQuestion = {
  id: number;
  type: NativeQuestionType;
  points: number;
  prompt?: string;
  options?: {
    choices?: Array<{ id: string; label: string; correct?: boolean }>;
    answer?: string;
    acceptable?: string[];
  } | null;
};

export type NativeAnswer = {
  questionId: number;
  value: string | string[] | null;
};

function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function gradeObjectiveQuestion(
  question: NativeQuestion,
  answer: NativeAnswer | undefined,
): { points: number; max: number; correct: boolean | null; manual: boolean } {
  const max = question.points || 1;
  if (question.type === 'essay') {
    return { points: 0, max, correct: null, manual: true };
  }
  const raw = answer?.value;
  const given = Array.isArray(raw) ? raw.join(' ') : String(raw ?? '');
  if (!given.trim()) return { points: 0, max, correct: false, manual: false };

  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    const correctIds = (question.options?.choices || [])
      .filter((c) => c.correct)
      .map((c) => String(c.id));
    const givenIds = Array.isArray(raw) ? raw.map(String) : [String(raw)];
    const ok =
      correctIds.length > 0 &&
      givenIds.length === correctIds.length &&
      givenIds.every((id) => correctIds.includes(id));
    return { points: ok ? max : 0, max, correct: ok, manual: false };
  }

  const acceptable = [question.options?.answer, ...(question.options?.acceptable || [])]
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map(norm);
  const ok = acceptable.includes(norm(given));
  return { points: ok ? max : 0, max, correct: ok, manual: false };
}

export function gradeAttempt(
  questions: NativeQuestion[],
  answers: NativeAnswer[],
): {
  score: number;
  maxScore: number;
  needsManualGrade: boolean;
  breakdown: Array<{
    questionId: number;
    points: number;
    max: number;
    correct: boolean | null;
    manual: boolean;
  }>;
} {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const breakdown = questions.map((q) => {
    const result = gradeObjectiveQuestion(q, byId.get(q.id));
    return { questionId: q.id, ...result };
  });
  const earned = breakdown.reduce((s, b) => s + b.points, 0);
  const maxScore = breakdown.reduce((s, b) => s + b.max, 0) || 1;
  return {
    score: Math.round((earned / maxScore) * 1000) / 10,
    maxScore,
    needsManualGrade: breakdown.some((b) => b.manual),
    breakdown,
  };
}

export function studentSafeQuestion(question: NativeQuestion): Omit<NativeQuestion, 'options'> & {
  options: { choices: Array<{ id: string; label: string }> };
} {
  return {
    id: question.id,
    type: question.type,
    points: question.points,
    prompt: question.prompt,
    options: {
      choices: (question.options?.choices || []).map((c) => ({
        id: c.id,
        label: c.label,
      })),
    },
  };
}
