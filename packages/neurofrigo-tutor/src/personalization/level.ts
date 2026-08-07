import type { LearningLevel, StudentProfile, LearningProfile } from '../domain/types';
import { LEVEL_LABELS } from '../domain/types';

export function estimateLevel(input: {
  progressPercent: number;
  aiUsageCount: number;
  avgGrounding: number;
  negativeFeedbackCount: number;
}): LearningLevel {
  const { progressPercent, aiUsageCount, avgGrounding, negativeFeedbackCount } = input;

  if (progressPercent >= 85 && avgGrounding >= 0.55 && negativeFeedbackCount <= 1) {
    return 'specialist';
  }
  if (progressPercent >= 60 || (aiUsageCount >= 8 && avgGrounding >= 0.5)) {
    return 'advanced';
  }
  if (progressPercent >= 25 || aiUsageCount >= 3) {
    return 'intermediate';
  }
  return 'beginner';
}

export function levelInstruction(level: LearningLevel): string {
  switch (level) {
    case 'beginner':
      return 'Use linguagem simples, conceitos básicos e analogias do dia a dia. Evite jargão sem explicar.';
    case 'intermediate':
      return 'Equilibre clareza e termos técnicos. Inclua passos práticos e relações entre componentes.';
    case 'advanced':
      return 'Use termos técnicos com precisão. Detalhe parâmetros, causas e consequências operacionais.';
    case 'specialist':
      return 'Aprofunde com detalhes técnicos, normas, boas práticas de planta e trade-offs de engenharia.';
  }
}

export function buildProfileLabel(level: LearningLevel, student: StudentProfile): string {
  return `Aluno · ${LEVEL_LABELS[level]} · progresso ${Math.round(student.progressPercent)}% · ${levelInstruction(level)}`;
}

export function buildPersonalizedHint(level: LearningLevel): string {
  return `Resposta adaptada ao nível ${LEVEL_LABELS[level]}.`;
}

export function buildEncouragement(
  level: LearningLevel,
  student: StudentProfile,
  gapsCount: number,
): string {
  if (student.progressPercent >= 100) {
    return 'Curso concluído — revise tópicos críticos e aprofunde boas práticas.';
  }
  if (gapsCount > 0) {
    return 'Identifiquei pontos para revisar. Continuar nesses tópicos fortalece sua base.';
  }
  if (level === 'beginner') {
    return 'Bom começo. Siga a próxima aula sugerida para consolidar o fundamento.';
  }
  if (level === 'specialist') {
    return 'Excelente domínio. Explore revisões avançadas e detalhamento normativo.';
  }
  return 'Continue no ritmo. A próxima recomendação mantém sua sequência de estudo.';
}

export function mergeLearningSignals(
  base: LearningProfile,
  student: StudentProfile,
  signals: {
    questions: Array<{ question: string; groundingScore: number; status: string }>;
    negativeFeedbackCount: number;
  },
): LearningProfile {
  const aiUsageCount = Math.max(base.aiUsageCount, signals.questions.length);
  const avgGrounding =
    signals.questions.length > 0
      ? signals.questions.reduce((s, q) => s + (q.groundingScore || 0), 0) /
        signals.questions.length
      : base.avgGrounding;

  const freq = new Map<string, number>();
  for (const q of signals.questions) {
    const key = q.question.trim().toLowerCase().slice(0, 120);
    if (!key) continue;
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  const repeatedQuestions = [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .map(([q]) => q)
    .slice(0, 5);

  const difficultyTopics = signals.questions
    .filter((q) => q.groundingScore < 0.35 || q.status === 'not_found')
    .map((q) => q.question.slice(0, 80))
    .slice(0, 5);

  const level = estimateLevel({
    progressPercent: student.progressPercent,
    aiUsageCount,
    avgGrounding,
    negativeFeedbackCount: signals.negativeFeedbackCount,
  });

  return {
    ...base,
    level,
    aiUsageCount,
    avgGrounding: Number(avgGrounding.toFixed(3)),
    negativeFeedbackCount: signals.negativeFeedbackCount,
    repeatedQuestions,
    difficultyTopics:
      difficultyTopics.length > 0 ? difficultyTopics : base.difficultyTopics,
  };
}
