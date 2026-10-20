import type { StudentProfile, StudyRecommendation } from '../domain/types';

const NEXT_STEP_RE =
  /pr[oó]ximo\s+passo|pr[oó]xima\s+aula|o\s+que\s+(eu\s+)?(estudo|fa[cç]o|devo\s+(estudar|fazer)|aprendo)\s+agora|o\s+que\s+estud(o|ar)\s+agora|qual\s+(aula|li[cç][aã]o)\s+(fa[cç]o|vem)\s+depois|para\s+onde\s+(eu\s+)?(vou|sigo)|seguinte\s+(aula|passo)|meu\s+pr[oó]ximo\s+passo|pr[oó]ximo\s+passo\s+no\s+curso|qual\s+[eé]\s+meu\s+pr[oó]ximo\s+passo/i;

export function isLmsNextStepQuestion(question: string): boolean {
  const q = question.trim();
  if (!q || q.length > 160) return false;
  return NEXT_STEP_RE.test(q);
}

export function composeLmsNextStepAnswer(input: {
  courseTitle?: string | null;
  progressPercent?: number | null;
  currentLessonTitle?: string | null;
  recommendations: StudyRecommendation[];
  student?: StudentProfile | null;
}): string {
  const next = input.recommendations.find((r) => r.type === 'next_lesson');
  const review = input.recommendations.find((r) => r.type === 'review');
  const progress =
    input.progressPercent != null && Number.isFinite(input.progressPercent)
      ? Math.round(input.progressPercent)
      : input.student
        ? Math.round(input.student.progressPercent)
        : null;
  const course = input.courseTitle?.trim() || 'seu curso';

  if (next) {
    const lines = [`Seu próximo passo no LMS (${course}) é **${next.title}**.`, next.reason];
    if (input.currentLessonTitle) {
      lines.splice(
        1,
        0,
        `Você está em **${input.currentLessonTitle}**` +
          (progress != null ? ` · progresso ~${progress}%.` : '.'),
      );
    } else if (progress != null) {
      lines.push(`Progresso atual no curso: ~${progress}%.`);
    }
    if (review && review.lessonId !== next.lessonId) {
      lines.push(`Se quiser reforçar antes, revise **${review.title}**.`);
    }
    lines.push(
      'Isso vem do seu progresso autorizado no curso — não de um trecho genérico da aula.',
    );
    return lines.filter(Boolean).join('\n');
  }

  if (progress != null && progress >= 100) {
    return [
      `Você já concluiu as aulas sequenciais de **${course}**.`,
      review
        ? `Próximo passo útil: revisar **${review.title}** ou seguir para a avaliação pendente, se houver.`
        : 'Próximo passo: verificar avaliações pendentes ou o certificado no painel do aluno.',
    ].join('\n');
  }

  return [
    `Não há uma próxima aula liberada na sequência de **${course}** neste momento.`,
    'Confira no LMS se a aula atual está concluída ou se há avaliação pendente antes de avançar.',
  ].join('\n');
}
