/**
 * Navegação e resolução de conteúdo da Lesson Experience (Épico B).
 * Dados vêm do Connector (content + progress) — nunca Moodle direto.
 */

export type LessonActivity = {
  moodleActivityId: number;
  name: string;
  modName: string;
  visible: boolean;
  url?: string | null;
  completionEnabled?: boolean;
};

export type LessonSection = {
  sectionId: number;
  name: string;
  summary?: string | null;
  visible?: boolean;
  activities: LessonActivity[];
};

export type FlatLesson = {
  courseId: number;
  activityId: number;
  sectionId: number;
  sectionName: string;
  name: string;
  modName: string;
  index: number;
};

export type LessonContentKind =
  'text' | 'html' | 'external_link' | 'video' | 'pdf' | 'h5p' | 'file' | 'quiz' | 'assignment';

export type LessonContentBlock = {
  kind: LessonContentKind;
  title: string;
  bodyHtml?: string | null;
  externalUrl?: string | null;
  placeholderMessage: string;
};

/** Atividades visíveis em ordem de seções (navegação linear). */
export function flattenVisibleLessons(courseId: number, sections: LessonSection[]): FlatLesson[] {
  const out: FlatLesson[] = [];
  for (const section of sections) {
    if (section.visible === false) continue;
    for (const activity of section.activities) {
      if (!activity.visible) continue;
      out.push({
        courseId,
        activityId: activity.moodleActivityId,
        sectionId: section.sectionId,
        sectionName: section.name,
        name: activity.name,
        modName: activity.modName,
        index: out.length,
      });
    }
  }
  return out;
}

export function findLessonNeighbors(
  flat: FlatLesson[],
  activityId: number,
): { current: FlatLesson | null; prev: FlatLesson | null; next: FlatLesson | null } {
  const index = flat.findIndex((l) => l.activityId === activityId);
  if (index < 0) return { current: null, prev: null, next: null };
  return {
    current: flat[index] ?? null,
    prev: index > 0 ? flat[index - 1]! : null,
    next: index < flat.length - 1 ? flat[index + 1]! : null,
  };
}

export function lessonHref(courseId: number, activityId: number): string {
  return `/lms/cursos/${courseId}/atividades/${activityId}`;
}

export function moduleHref(courseId: number, sectionId: number): string {
  return `/lms/cursos/${courseId}#modulo-${sectionId}`;
}

export function courseHref(courseId: number): string {
  return `/lms/cursos/${courseId}`;
}

/** Estado pedagógico da aula a partir do progress Moodle + conclusão local. */
export type LessonUiStatus =
  'loading' | 'offline' | 'error' | 'forbidden' | 'blocked' | 'completed' | 'in_progress';

export function resolveLessonUiStatus(input: {
  loading?: boolean;
  offline?: boolean;
  error?: boolean;
  forbidden?: boolean;
  blocked?: boolean;
  moodleState?: number | null;
  locallyCompleted?: boolean;
}): LessonUiStatus {
  if (input.loading) return 'loading';
  if (input.error) return 'error';
  if (input.forbidden) return 'forbidden';
  if (input.blocked) return 'blocked';
  if (input.offline) return 'offline';
  const done = input.locallyCompleted || input.moodleState === 1 || input.moodleState === 2;
  return done ? 'completed' : 'in_progress';
}

export function estimateMinutes(modName: string): number {
  const m = modName.toLowerCase();
  if (m.includes('quiz')) return 20;
  if (m.includes('assign')) return 30;
  if (m.includes('h5p') || m.includes('hvp')) return 12;
  if (m.includes('video') || m.includes('url')) return 15;
  if (m.includes('resource') || m.includes('folder') || m.includes('file')) return 10;
  if (m.includes('page') || m.includes('label') || m.includes('book')) return 8;
  return 10;
}

function isAuthorizedExternalUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== 'string') return false;
  if (/moodle/i.test(url)) return false;
  if (/\[redacted/i.test(url)) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function resolveContentKind(modName: string, activityName = ''): LessonContentKind {
  const m = modName.toLowerCase();
  const n = activityName.toLowerCase();
  if (m.includes('quiz')) return 'quiz';
  if (m.includes('assign')) return 'assignment';
  if (m.includes('h5p') || m.includes('hvp')) return 'h5p';
  if (m.includes('video') || n.endsWith('.mp4') || n.includes('vídeo') || n.includes('video')) {
    return 'video';
  }
  if (n.endsWith('.pdf') || m === 'pdf') return 'pdf';
  if (m.includes('folder') || m.includes('resource') || m.includes('file')) return 'file';
  if (m === 'url') return 'external_link';
  if (m.includes('page') || m.includes('label') || m.includes('book') || m.includes('wiki')) {
    return 'html';
  }
  return 'text';
}

export function buildLessonContentBlocks(input: {
  activity: LessonActivity;
  sectionSummary?: string | null;
}): LessonContentBlock[] {
  const kind = resolveContentKind(input.activity.modName, input.activity.name);
  const summary = input.sectionSummary?.trim() || null;
  const blocks: LessonContentBlock[] = [];

  if (summary) {
    blocks.push({
      kind: 'html',
      title: 'Contexto do módulo',
      bodyHtml: summary,
      placeholderMessage: '',
    });
  }

  switch (kind) {
    case 'external_link': {
      const url = isAuthorizedExternalUrl(input.activity.url) ? input.activity.url : null;
      blocks.push({
        kind: 'external_link',
        title: input.activity.name,
        externalUrl: url,
        placeholderMessage: url
          ? 'Link externo autorizado pelo Connector.'
          : 'Link externo indisponível ou bloqueado (URLs Moodle não são expostas).',
      });
      break;
    }
    case 'video':
      blocks.push({
        kind: 'video',
        title: 'Vídeo',
        placeholderMessage:
          'Player de vídeo protegido chega em sprint futura. Streaming CDN fora do escopo.',
      });
      break;
    case 'pdf':
      blocks.push({
        kind: 'pdf',
        title: 'PDF',
        placeholderMessage: 'Visualizador PDF Omnia (view-only) — placeholder nesta sprint.',
      });
      break;
    case 'h5p':
      blocks.push({
        kind: 'h5p',
        title: 'H5P',
        placeholderMessage: 'Experiência H5P Omnia — placeholder nesta sprint.',
      });
      break;
    case 'file':
      blocks.push({
        kind: 'file',
        title: 'Arquivos',
        placeholderMessage: 'Download direto de arquivos Moodle não é exposto. Placeholder.',
      });
      break;
    case 'quiz':
      blocks.push({
        kind: 'quiz',
        title: 'Quiz',
        placeholderMessage:
          'Runner de quiz Omnia virá no Épico de avaliações. Metadados e progresso já vêm do Connector.',
      });
      break;
    case 'assignment':
      blocks.push({
        kind: 'assignment',
        title: 'Tarefa',
        placeholderMessage: 'Entrega de tarefa Omnia — fora do escopo desta sprint.',
      });
      break;
    case 'html':
      if (!summary) {
        blocks.push({
          kind: 'html',
          title: input.activity.name,
          bodyHtml: null,
          placeholderMessage:
            'Conteúdo HTML sanitizado do módulo. Descrição detalhada da atividade depende de campos adicionais do Connector.',
        });
      }
      break;
    default:
      blocks.push({
        kind: 'text',
        title: input.activity.name,
        placeholderMessage:
          'Esta aula está disponível na experiência Omnia. Progresso e navegação usam o Learning Engine + Connector.',
      });
  }

  return blocks;
}

export function lessonStatusLabel(status: LessonUiStatus): string {
  switch (status) {
    case 'loading':
      return 'Carregando';
    case 'offline':
      return 'Offline';
    case 'error':
      return 'Erro';
    case 'forbidden':
      return 'Sem permissão';
    case 'blocked':
      return 'Bloqueada';
    case 'completed':
      return 'Concluída';
    case 'in_progress':
      return 'Em andamento';
    default:
      return status;
  }
}
