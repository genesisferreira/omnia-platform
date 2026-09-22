import type {
  CatalogLesson,
  CourseCatalog,
  LearningGap,
  LearningProfile,
  StudentProfile,
  StudyPlan,
  StudyRecommendation,
} from '../domain/types';

function remainingLessons(catalog: CourseCatalog, student: StudentProfile): CatalogLesson[] {
  const done = new Set(student.completedLessonIds.map(String));
  return catalog.lessons
    .filter((l) => !done.has(String(l.id)))
    .sort((a, b) => a.moduleOrder - b.moduleOrder || a.order - b.order);
}

export function buildRecommendations(input: {
  catalog: CourseCatalog;
  student: StudentProfile;
  learning: LearningProfile;
  currentLessonId?: string | null;
}): StudyRecommendation[] {
  const { catalog, student, learning, currentLessonId } = input;
  const out: StudyRecommendation[] = [];
  const remaining = remainingLessons(catalog, student);

  const next = remaining[0];
  if (next) {
    out.push({
      type: 'next_lesson',
      title: next.title,
      reason: 'Próxima aula autorizada na sequência do curso.',
      courseId: catalog.courseId,
      moduleId: next.moduleId,
      lessonId: next.id,
      lessonSlug: next.slug,
      moduleSlug: catalog.modules.find((m) => m.id === next.moduleId)?.slug ?? null,
    });
  }

  const relatedModule = catalog.modules.find((m) => {
    if (currentLessonId) {
      const current = catalog.lessons.find((l) => String(l.id) === String(currentLessonId));
      if (current && String(m.id) === String(current.moduleId)) return false;
    }
    return !student.completedModuleIds.map(String).includes(String(m.id));
  });
  if (relatedModule) {
    out.push({
      type: 'related_module',
      title: relatedModule.title,
      reason: 'Módulo relacionado ainda pendente no LMS.',
      courseId: catalog.courseId,
      moduleId: relatedModule.id,
      moduleSlug: relatedModule.slug,
      lessonId: relatedModule.lessons[0]?.id ?? null,
      lessonSlug: relatedModule.lessons[0]?.slug ?? null,
    });
  }

  const complementary = remaining[1] || remaining[0];
  if (complementary && complementary.id !== next?.id) {
    out.push({
      type: 'complementary',
      title: complementary.title,
      reason: 'Conteúdo complementar autorizado do mesmo curso.',
      courseId: catalog.courseId,
      moduleId: complementary.moduleId,
      lessonId: complementary.id,
      lessonSlug: complementary.slug,
    });
  }

  if (learning.difficultyTopics.length > 0 || learning.repeatedQuestions.length > 0) {
    const reviewLesson =
      catalog.lessons.find((l) => student.completedLessonIds.map(String).includes(String(l.id))) ||
      catalog.lessons[0];
    if (reviewLesson) {
      out.push({
        type: 'review',
        title: reviewLesson.title,
        reason: 'Revisão recomendada com base em dúvidas/dificuldades recentes.',
        courseId: catalog.courseId,
        moduleId: reviewLesson.moduleId,
        lessonId: reviewLesson.id,
        lessonSlug: reviewLesson.slug,
      });
    }
  }

  return out.slice(0, 4);
}

export function buildStudyPlan(input: {
  objective: string;
  catalog: CourseCatalog;
  student: StudentProfile;
}): StudyPlan {
  const { objective, catalog, student } = input;
  const tokens = objective
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);

  const scored = catalog.lessons.map((lesson) => {
    const hay = `${lesson.title} ${lesson.moduleTitle} ${lesson.summary || ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const score = tokens.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
    const pending = !student.completedLessonIds.map(String).includes(String(lesson.id));
    return { lesson, score, pending };
  });

  scored.sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    return a.lesson.moduleOrder - b.lesson.moduleOrder || a.lesson.order - b.lesson.order;
  });

  const selected = (scored.some((s) => s.score > 0) ? scored.filter((s) => s.score > 0) : scored)
    .slice(0, 6)
    .map((s) => s.lesson);

  // Sempre preferir ordem curricular se objetivo genérico
  const sequence =
    tokens.length === 0 || selected.length === 0
      ? remainingLessons(catalog, student).slice(0, 6)
      : selected;

  const steps = sequence.map((lesson, i) => ({
    order: i + 1,
    moduleId: lesson.moduleId,
    moduleTitle: lesson.moduleTitle,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    lessonSlug: lesson.slug,
    rationale:
      i === 0
        ? 'Ponto de partida alinhado ao seu objetivo e ao LMS publicado.'
        : 'Continuidade na sequência autorizada do curso.',
  }));

  return {
    objective,
    courseId: catalog.courseId,
    courseTitle: catalog.courseTitle,
    steps,
    estimatedLessons: steps.length,
  };
}

export function detectGaps(input: {
  learning: LearningProfile;
  catalog: CourseCatalog;
}): LearningGap[] {
  const { learning, catalog } = input;
  const gaps: LearningGap[] = [];

  for (const topic of learning.repeatedQuestions.slice(0, 3)) {
    const match = catalog.lessons.find((l) => l.title.toLowerCase().includes(topic.slice(0, 12)));
    gaps.push({
      topic,
      reason: 'Pergunta repetida na sessão/histórico recente do Tutor.',
      severity: 'medium',
      suggestedLessonId: match?.id ?? catalog.lessons[0]?.id ?? null,
      suggestedLessonTitle: match?.title ?? catalog.lessons[0]?.title ?? null,
    });
  }

  for (const topic of learning.difficultyTopics.slice(0, 3)) {
    gaps.push({
      topic,
      reason: 'Baixo grounding ou resposta sem contexto autorizado.',
      severity: learning.avgGrounding < 0.3 ? 'high' : 'medium',
      suggestedLessonId: catalog.lessons[0]?.id ?? null,
      suggestedLessonTitle: catalog.lessons[0]?.title ?? null,
    });
  }

  if (learning.negativeFeedbackCount >= 2) {
    gaps.push({
      topic: 'Feedback negativo recorrente',
      reason: 'Há avaliações negativas recentes — revise fundamentos do módulo atual.',
      severity: 'high',
      suggestedLessonId: catalog.lessons[0]?.id ?? null,
      suggestedLessonTitle: catalog.lessons[0]?.title ?? null,
    });
  }

  for (const pending of learning.pendingTopics.slice(0, 2)) {
    const match = catalog.lessons.find((l) =>
      l.title.toLowerCase().includes(pending.toLowerCase().slice(0, 10)),
    );
    gaps.push({
      topic: pending,
      reason: 'Tópico pendente no progresso do LMS.',
      severity: 'low',
      suggestedLessonId: match?.id ?? null,
      suggestedLessonTitle: match?.title ?? pending,
    });
  }

  return gaps.slice(0, 6);
}
