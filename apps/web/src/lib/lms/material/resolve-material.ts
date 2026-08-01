import type { LessonActivity, LessonContentKind } from '@/lib/lms/lesson-nav';
import { estimateMinutes, resolveContentKind } from '@/lib/lms/lesson-nav';

import type {
  MaterialDescriptor,
  MaterialPermissions,
  MaterialType,
  MaterialUiState,
  ResolvedMaterial,
} from './types';

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

function mapKindToMaterialType(kind: LessonContentKind): MaterialType {
  switch (kind) {
    case 'text':
      return 'text';
    case 'html':
      return 'html';
    case 'external_link':
      return 'external_link';
    case 'video':
      return 'video';
    case 'pdf':
      return 'pdf';
    case 'h5p':
      return 'h5p';
    case 'file':
      return 'file';
    case 'quiz':
    case 'assignment':
      return 'unknown';
    default:
      return 'unknown';
  }
}

function statusFor(state: MaterialUiState): string {
  switch (state) {
    case 'loading':
      return 'Carregando';
    case 'skeleton':
      return 'Carregando';
    case 'error':
      return 'Erro';
    case 'offline':
      return 'Offline';
    case 'forbidden':
      return 'Sem permissão';
    case 'blocked':
      return 'Bloqueado';
    case 'unavailable':
      return 'Indisponível';
    case 'empty':
      return 'Conteúdo vazio';
    case 'ready':
      return 'Disponível';
    default:
      return state;
  }
}

export type ResolveMaterialInput = {
  descriptor: MaterialDescriptor;
  offline?: boolean;
  forceState?: MaterialUiState;
};

/**
 * MaterialProvider (núcleo puro) — resolve tipo, renderer, permissões, metadata, preview, fallback.
 * Sem acesso a Moodle.
 */
export function resolveMaterial(input: ResolveMaterialInput): ResolvedMaterial {
  const d = input.descriptor;
  let state: MaterialUiState = input.forceState ?? 'ready';

  if (input.offline) state = 'offline';
  else if (!d.permissions.canView) state = 'forbidden';
  else if (d.permissions.reason === 'blocked') state = 'blocked';
  else if (d.permissions.reason === 'unavailable') state = 'unavailable';
  else {
    const empty =
      !d.source.body?.trim() &&
      !d.source.externalUrl &&
      !d.source.previewUrl &&
      (d.type === 'text' || d.type === 'html' || d.type === 'image' || d.type === 'external_link');
    const placeholderOnly = ['pdf', 'video', 'h5p', 'file', 'unknown'].includes(d.type);
    if (empty && !placeholderOnly && !d.fallbackMessage) state = 'empty';
  }

  return {
    ...d,
    metadata: {
      ...d.metadata,
      statusLabel: statusFor(state),
    },
    state,
    rendererKey: d.type,
    previewAvailable: Boolean(d.source.previewUrl),
  };
}

export type BuildMaterialsInput = {
  courseId: number;
  activity: LessonActivity;
  sectionId?: number | null;
  sectionSummary?: string | null;
  lastAccessedAt?: string | null;
};

/**
 * Constrói descriptors de material a partir da aula (Connector → Experience).
 */
export function buildMaterialsFromLesson(input: BuildMaterialsInput): MaterialDescriptor[] {
  const kind = resolveContentKind(input.activity.modName, input.activity.name);
  const materials: MaterialDescriptor[] = [];
  const basePerms: MaterialPermissions = {
    canView: input.activity.visible !== false,
    canDownload: false,
    canComplete: true,
  };

  const summary = input.sectionSummary?.trim() || null;
  if (summary) {
    materials.push({
      id: `mat:${input.activity.moodleActivityId}:module-html`,
      courseId: input.courseId,
      activityId: input.activity.moodleActivityId,
      sectionId: input.sectionId ?? null,
      type: 'html',
      metadata: {
        id: `mat:${input.activity.moodleActivityId}:module-html`,
        name: 'Contexto do módulo',
        type: 'html',
        description: 'Resumo do módulo (HTML sanitizado)',
        sizeBytes: null,
        estimatedMinutes: 3,
        lastAccessedAt: input.lastAccessedAt ?? null,
        statusLabel: 'Disponível',
        mimeType: 'text/html',
      },
      source: { body: summary, assetId: `omnia-material:${input.courseId}:${input.activity.moodleActivityId}:module-html` },
      permissions: basePerms,
    });
  }

  const type = mapKindToMaterialType(kind);
  const materialId = `mat:${input.activity.moodleActivityId}:primary`;
  const externalUrl =
    type === 'external_link' && isAuthorizedExternalUrl(input.activity.url)
      ? input.activity.url
      : null;

  let fallbackMessage: string | null = null;
  let body: string | null = null;

  switch (type) {
    case 'html':
      if (!summary) {
        fallbackMessage =
          'Conteúdo HTML da atividade depende de campos adicionais do Connector. Placeholder seguro.';
      }
      break;
    case 'text':
      body = `Material da aula “${input.activity.name}” (tipo ${input.activity.modName}). Progresso e eventos via Learning Engine.`;
      break;
    case 'external_link':
      fallbackMessage = externalUrl
        ? 'Link externo autorizado.'
        : 'Link externo indisponível ou bloqueado (URLs Moodle não são expostas).';
      break;
    case 'video':
      fallbackMessage =
        'Player de vídeo protegido — placeholder. Streaming CDN / signed URLs em sprint futura.';
      break;
    case 'pdf':
      fallbackMessage = 'Visualizador PDF Omnia (view-only) — placeholder nesta sprint.';
      break;
    case 'h5p':
      fallbackMessage = 'Experiência H5P Omnia — placeholder nesta sprint.';
      break;
    case 'file':
      fallbackMessage = 'Arquivos Moodle não são baixáveis diretamente. Placeholder.';
      break;
    case 'image':
      fallbackMessage = 'Imagem indisponível.';
      break;
    default:
      fallbackMessage = `Tipo “${input.activity.modName}” ainda sem renderer dedicado — UnknownRenderer.`;
  }

  // Evita duplicar HTML se já temos summary como material separado e kind é html
  if (!(type === 'html' && summary)) {
    materials.push({
      id: materialId,
      courseId: input.courseId,
      activityId: input.activity.moodleActivityId,
      sectionId: input.sectionId ?? null,
      type,
      metadata: {
        id: materialId,
        name: input.activity.name,
        type,
        description: `Tipo Connector: ${input.activity.modName}`,
        sizeBytes: null,
        estimatedMinutes: estimateMinutes(input.activity.modName),
        lastAccessedAt: input.lastAccessedAt ?? null,
        statusLabel: 'Disponível',
        mimeType:
          type === 'pdf'
            ? 'application/pdf'
            : type === 'html'
              ? 'text/html'
              : type === 'image'
                ? 'image/*'
                : null,
      },
      source: {
        body,
        externalUrl,
        previewUrl: null,
        assetId: `omnia-material:${input.courseId}:${input.activity.moodleActivityId}:primary`,
      },
      permissions: basePerms,
      fallbackMessage,
    });
  } else if (type !== 'html') {
    // already pushed primary above when not html+summary — handled
  }

  if (materials.length === 0) {
    materials.push({
      id: materialId,
      courseId: input.courseId,
      activityId: input.activity.moodleActivityId,
      sectionId: input.sectionId ?? null,
      type: 'unknown',
      metadata: {
        id: materialId,
        name: input.activity.name,
        type: 'unknown',
        description: null,
        estimatedMinutes: estimateMinutes(input.activity.modName),
        lastAccessedAt: input.lastAccessedAt ?? null,
        statusLabel: 'Indisponível',
      },
      source: {},
      permissions: basePerms,
      fallbackMessage: 'Nenhum material disponível para esta aula.',
    });
  }

  return materials;
}

export function findMaterialNeighbors(
  materials: MaterialDescriptor[],
  materialId: string,
): {
  current: MaterialDescriptor | null;
  prev: MaterialDescriptor | null;
  next: MaterialDescriptor | null;
  index: number;
} {
  const index = materials.findIndex((m) => m.id === materialId);
  if (index < 0) return { current: null, prev: null, next: null, index: -1 };
  return {
    current: materials[index] ?? null,
    prev: index > 0 ? materials[index - 1]! : null,
    next: index < materials.length - 1 ? materials[index + 1]! : null,
    index,
  };
}
