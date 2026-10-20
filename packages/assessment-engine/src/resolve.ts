import type {
  AssessmentDescriptor,
  AssessmentType,
  AssessmentUiStatus,
  ResolvedAssessment,
} from './types';

export function detectAssessmentType(modName: string): AssessmentType {
  const m = modName.toLowerCase();
  if (m.includes('quiz')) return 'quiz';
  if (m.includes('assign')) return 'assignment';
  return 'unknown';
}

export function isAssessmentMod(modName: string): boolean {
  return detectAssessmentType(modName) !== 'unknown';
}

export function statusLabel(status: AssessmentUiStatus): string {
  switch (status) {
    case 'available':
      return 'Disponível';
    case 'unavailable':
      return 'Indisponível';
    case 'in_progress':
      return 'Em andamento';
    case 'completed':
      return 'Concluído';
    case 'grade_published':
      return 'Nota publicada';
    case 'feedback_available':
      return 'Feedback disponível';
    default:
      return status;
  }
}

export function resolveUiStatus(descriptor: AssessmentDescriptor): AssessmentUiStatus {
  if (!descriptor.availability.available || !descriptor.permissions.canView) {
    return 'unavailable';
  }
  if (descriptor.feedback.available && descriptor.feedback.summary) {
    return 'feedback_available';
  }
  if (descriptor.grade?.published) {
    return 'grade_published';
  }
  if (descriptor.completion.completed) {
    return 'completed';
  }
  if (
    descriptor.completion.state === 0 &&
    descriptor.attempts.used &&
    descriptor.attempts.used > 0
  ) {
    return 'in_progress';
  }
  if (descriptor.completion.state === 0) {
    // state 0 with no attempts = available; with progress mid-way treated above
    return descriptor.attempts.used && descriptor.attempts.used > 0 ? 'in_progress' : 'available';
  }
  return 'available';
}

export type BuildAssessmentInput = {
  courseId: number;
  activityId: number;
  sectionId?: number | null;
  name: string;
  modName: string;
  visible: boolean;
  sectionSummary?: string | null;
  progressState?: number;
  timeCompleted?: string | null;
  grade?: {
    itemName: string;
    gradeFormatted: string | null;
    percentage: number | null;
  } | null;
};

export function buildAssessmentDescriptor(input: BuildAssessmentInput): AssessmentDescriptor {
  const type = detectAssessmentType(input.modName);
  const completed = input.progressState === 1 || input.progressState === 2;
  const gradePublished = Boolean(
    input.grade && (input.grade.gradeFormatted != null || input.grade.percentage != null),
  );
  const id = `assess:${input.courseId}:${input.activityId}`;

  const descriptor: AssessmentDescriptor = {
    id,
    courseId: input.courseId,
    activityId: input.activityId,
    sectionId: input.sectionId ?? null,
    type,
    metadata: {
      id,
      name: input.name,
      type,
      description: input.sectionSummary?.replace(/<[^>]+>/g, ' ').trim() || null,
      instructions:
        type === 'quiz'
          ? 'Visualização read-only do quiz. Submissão Omnia será habilitada em sprint futura (Write API).'
          : type === 'assignment'
            ? 'Visualização read-only da tarefa. Entrega Omnia fora do escopo deste épico.'
            : 'Atividade acadêmica — renderer genérico.',
      modName: input.modName,
      statusLabel: '',
      estimatedMinutes: type === 'quiz' ? 20 : type === 'assignment' ? 30 : 15,
    },
    permissions: {
      canView: input.visible !== false,
      canAttempt: false,
      canSubmit: false,
      reason: 'READ_ONLY_CONNECTOR',
    },
    availability: {
      available: input.visible !== false,
      reason: input.visible === false ? 'Atividade não visível' : null,
      dueAt: null,
    },
    attempts: {
      used: null,
      max: null,
      remaining: null,
    },
    grade: input.grade
      ? {
          itemName: input.grade.itemName,
          gradeFormatted: input.grade.gradeFormatted,
          percentage: input.grade.percentage,
          published: gradePublished,
        }
      : null,
    feedback: {
      available: gradePublished,
      summary: gradePublished
        ? 'Nota publicada pelo motor acadêmico. Feedback detalhado (comentários) depende de campos adicionais do Connector.'
        : null,
    },
    completion: {
      completed,
      state: input.progressState ?? 0,
      timeCompleted: input.timeCompleted ?? null,
    },
  };

  const ui = resolveUiStatus(descriptor);
  descriptor.metadata.statusLabel = statusLabel(ui);
  return descriptor;
}

export function resolveAssessment(descriptor: AssessmentDescriptor): ResolvedAssessment {
  const uiStatus = resolveUiStatus(descriptor);
  return {
    ...descriptor,
    metadata: {
      ...descriptor.metadata,
      statusLabel: statusLabel(uiStatus),
    },
    uiStatus,
    rendererKey: descriptor.type,
  };
}
