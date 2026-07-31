import type { LearningEventEnvelope, LearningEventType, TimelineItem, TimelineItemKind } from '../types';

const KIND_BY_TYPE: Partial<Record<LearningEventType, TimelineItemKind>> = {
  'lesson.opened': 'lesson',
  'lesson.closed': 'lesson',
  'lesson.completed': 'lesson',
  'module.opened': 'module',
  'module.completed': 'module',
  'material.opened': 'material',
  'material.closed': 'material',
  'material.viewed': 'material',
  'material.completed': 'material',
  'assessment.opened': 'quiz',
  'assessment.closed': 'quiz',
  'assessment.viewed': 'quiz',
  'assessment.completed': 'quiz',
  'quiz.viewed': 'quiz',
  'assignment.viewed': 'activity',
  'grade.viewed': 'activity',
  'feedback.viewed': 'activity',
  'activity.started': 'activity',
  'activity.completed': 'activity',
  'progress.updated': 'progress',
  'continue.updated': 'continue',
  'continue.resolved': 'continue',
  'course.completed': 'completion',
  'course.opened': 'lesson',
};

function titleFor(event: LearningEventEnvelope): string {
  const courseId = event.payload.courseId;
  const activityId = event.payload.activityId;
  switch (event.type) {
    case 'lesson.opened':
      return activityId ? `Aula aberta (#${activityId})` : 'Aula aberta';
    case 'lesson.closed':
      return 'Aula fechada';
    case 'lesson.completed':
      return 'Aula concluída';
    case 'module.opened':
      return 'Módulo aberto';
    case 'module.completed':
      return 'Módulo concluído';
    case 'material.opened':
      return 'Material aberto';
    case 'material.closed':
      return 'Material fechado';
    case 'material.viewed':
      return 'Material visualizado';
    case 'material.completed':
      return 'Material concluído';
    case 'assessment.opened':
      return 'Avaliação aberta';
    case 'assessment.closed':
      return 'Avaliação fechada';
    case 'assessment.viewed':
      return 'Avaliação visualizada';
    case 'assessment.completed':
      return 'Avaliação concluída';
    case 'quiz.viewed':
      return 'Quiz visualizado';
    case 'assignment.viewed':
      return 'Tarefa visualizada';
    case 'grade.viewed':
      return 'Nota visualizada';
    case 'feedback.viewed':
      return 'Feedback visualizado';
    case 'activity.started':
      return 'Atividade iniciada';
    case 'activity.completed':
      return 'Atividade concluída';
    case 'progress.updated':
      return courseId != null ? `Progresso atualizado (curso ${courseId})` : 'Progresso atualizado';
    case 'continue.updated':
      return 'Continuar atualizado';
    case 'continue.resolved':
      return 'Continuar resolvido';
    case 'course.completed':
      return courseId != null ? `Curso ${courseId} concluído` : 'Curso concluído';
    case 'course.opened':
      return courseId != null ? `Curso ${courseId} aberto` : 'Curso aberto';
    default:
      return event.type;
  }
}

export function eventToTimelineItem(event: LearningEventEnvelope): TimelineItem {
  const kind = KIND_BY_TYPE[event.type] ?? 'activity';
  return {
    id: event.eventId,
    kind,
    title: titleFor(event),
    timestamp: event.timestamp,
    courseId: typeof event.payload.courseId === 'number' ? event.payload.courseId : undefined,
    activityId:
      typeof event.payload.activityId === 'number' || event.payload.activityId === null
        ? (event.payload.activityId as number | null)
        : undefined,
    sectionId:
      typeof event.payload.sectionId === 'number' || event.payload.sectionId === null
        ? (event.payload.sectionId as number | null)
        : undefined,
    eventType: event.type,
    meta: event.payload,
  };
}

/** Agrupa itens por dia local (YYYY-MM-DD) para UI “Hoje / …”. */
export function groupTimelineByDay(
  items: TimelineItem[],
  timeZone = 'America/Sao_Paulo',
): Array<{ day: string; label: string; items: TimelineItem[] }> {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const groups = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(item.timestamp));
    const list = groups.get(day) ?? [];
    list.push(item);
    groups.set(day, list);
  }

  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, dayItems]) => ({
      day,
      label: day === today ? 'Hoje' : day,
      items: dayItems.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    }));
}
