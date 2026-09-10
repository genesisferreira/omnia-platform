import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Payload, PayloadRequest } from 'payload';
import {
  chunkText,
  detectResourceType,
  extractByType,
  isSupportedExtractType,
  normalizeExtractedText,
  sha256Hex,
  type KiSupportedExtractType,
} from '@omnia/knowledge-intelligence';
import {
  AGENT_KEYS,
  KNOWLEDGE_AREAS,
  SECURITY_CLASSIFICATIONS,
  TECHNICAL_RISK_LEVELS,
  type AgentKey,
  type SourceType,
} from '@omnia/neurofrigo-knowledge';

import { requirePayloadRelationId, toPayloadRelationId } from '../../lib/payload-relation-id';

type Rel = string | number | { id: string | number } | null | undefined;

function relId(value: Rel): number | null {
  if (value == null) return null;
  if (typeof value === 'object' && 'id' in value) {
    return toPayloadRelationId(value.id) ?? null;
  }
  return toPayloadRelationId(value) ?? null;
}

function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/[A-Za-z0-9+/]{20,}={0,2}/g, '[redacted]').slice(0, 800);
}

/** Texto completo vai para chunks; Payload textarea pode rejeitar null bytes / payloads enormes. */
function sanitizeStoredText(text: string, maxChars = 60_000): string {
  const cleaned = text.split('\0').join('');
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars)}\n\n[truncated_for_admin_storage]`;
}

function pickUnion<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value && (allowed as readonly string[]).includes(value)) return value as T;
  return fallback;
}

function pickAgentKeys(values: string[] | undefined): AgentKey[] {
  if (!values?.length) return [];
  return values.filter((value): value is AgentKey =>
    (AGENT_KEYS as readonly string[]).includes(value),
  );
}

function sourceTypeFor(resourceType: string): SourceType {
  if (resourceType === 'pdf') return 'pdf';
  if (resourceType === 'markdown') return 'markdown';
  if (resourceType === 'txt') return 'txt';
  if (resourceType === 'docx') return 'docx';
  if (resourceType === 'pptx') return 'technical_manual';
  return 'lesson_ref';
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function resolveMediaBuffer(
  payload: Payload,
  mediaId: string | number,
): Promise<{ buffer: Buffer; mimeType: string | null; filename: string | null }> {
  const media = (await payload.findByID({
    collection: 'media',
    id: mediaId,
    depth: 0,
    overrideAccess: true,
  })) as {
    filename?: string | null;
    mimeType?: string | null;
    url?: string | null;
  };

  const filename = media.filename ?? null;
  if (!filename) {
    throw new Error('MEDIA_FILENAME_MISSING');
  }

  const candidates = [
    path.resolve(process.cwd(), 'media', filename),
    path.resolve(process.cwd(), 'apps/admin/media', filename),
    path.resolve('/app/media', filename),
    path.resolve('/app/apps/admin/media', filename),
    path.resolve(process.cwd(), '..', 'media', filename),
  ];

  for (const candidate of candidates) {
    try {
      const buffer = await readFile(candidate);
      return {
        buffer,
        mimeType: media.mimeType ?? null,
        filename,
      };
    } catch {
      // try next
    }
  }

  // Fallback HTTP (Admin runtime / Traefik) — útil quando seed roda fora do volume de media
  const base = (
    process.env.NEXT_PUBLIC_ADMIN_URL ||
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    ''
  ).replace(/\/$/, '');
  const urlPath = media.url?.startsWith('http')
    ? media.url
    : base && media.url
      ? `${base}${media.url.startsWith('/') ? '' : '/'}${media.url}`
      : null;
  if (urlPath) {
    try {
      const res = await fetch(urlPath);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return {
          buffer: Buffer.from(ab),
          mimeType: media.mimeType ?? null,
          filename,
        };
      }
    } catch {
      // fall through
    }
  }

  throw new Error(`MEDIA_FILE_NOT_FOUND:${filename}`);
}

async function deleteChildrenForResource(
  payload: Payload,
  learningResourceId: string | number,
  req?: PayloadRequest,
): Promise<void> {
  const chunks = await payload.find({
    collection: 'knowledge-chunks',
    where: { learningResource: { equals: learningResourceId } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    req,
  });
  for (const chunk of chunks.docs) {
    await payload.delete({
      collection: 'knowledge-chunks',
      id: chunk.id,
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });
  }

  const queue = await payload.find({
    collection: 'embedding-queue',
    where: { learningResource: { equals: learningResourceId } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    req,
  });
  for (const item of queue.docs) {
    await payload.delete({
      collection: 'embedding-queue',
      id: item.id,
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });
  }
}

export async function refreshKiDashboard(payload: Payload): Promise<void> {
  const [resources, completed, pending, failed, chunks, queuePending] = await Promise.all([
    payload.count({ collection: 'learning-resources', overrideAccess: true }),
    payload.count({
      collection: 'learning-resources',
      where: { processingStatus: { equals: 'completed' } },
      overrideAccess: true,
    }),
    payload.count({
      collection: 'learning-resources',
      where: {
        or: [
          { processingStatus: { equals: 'pending' } },
          { processingStatus: { equals: 'extracting' } },
          { processingStatus: { equals: 'normalizing' } },
          { processingStatus: { equals: 'chunking' } },
          { processingStatus: { equals: 'indexing_hub' } },
          { processingStatus: { equals: 'queued' } },
        ],
      },
      overrideAccess: true,
    }),
    payload.count({
      collection: 'learning-resources',
      where: { processingStatus: { equals: 'failed' } },
      overrideAccess: true,
    }),
    payload.count({ collection: 'knowledge-chunks', overrideAccess: true }),
    payload.count({
      collection: 'embedding-queue',
      where: { status: { equals: 'pending' } },
      overrideAccess: true,
    }),
  ]);

  await payload.updateGlobal({
    slug: 'ki-intelligence-dashboard',
    data: {
      filesCount: resources.totalDocs,
      processedCount: completed.totalDocs,
      pendingCount: pending.totalDocs,
      failedCount: failed.totalDocs,
      chunksCount: chunks.totalDocs,
      queuePendingCount: queuePending.totalDocs,
      lastRefreshAt: new Date().toISOString(),
      lastActivitySummary: `refresh ${new Date().toISOString()}`,
    },
    overrideAccess: true,
  });
}

/**
 * Pipeline completo: extract → normalize → chunk → KnowledgeDocument → embedding queue.
 * Não gera embeddings; não chama providers.
 */
export async function processLearningResource(args: {
  payload: Payload;
  learningResourceId: string | number;
  req?: PayloadRequest;
  /** Buffer opcional (evita roundtrip em disco quando o caller já tem os bytes). */
  sourceBuffer?: Buffer;
  sourceMimeType?: string | null;
  sourceFilename?: string | null;
  /** Quando pdf-parse já rodou antes do boot Payload (evita conflito runtime). */
  preExtracted?: { text: string; meta: Record<string, unknown> };
  /** Overrides do Hub (EPIC 10 — carga oficial publicada para Retrieval). */
  hubOverrides?: {
    title?: string;
    knowledgeArea?: string;
    category?: string | number;
    subcategories?: Array<string | number>;
    allowedAgents?: string[];
    ownerCompany?: string | number;
    allowAiUse?: boolean;
    publicationStatus?: 'unpublished' | 'published' | 'archived';
    status?: string;
    securityClassification?: string;
    technicalRiskLevel?: string;
    humanReviewRequired?: boolean;
    allowWebPublication?: boolean;
    tags?: string[];
    revisionNotes?: string;
  };
}): Promise<{ ok: boolean; chunkCount: number; knowledgeDocumentId?: string | number }> {
  const {
    payload,
    learningResourceId,
    req,
    sourceBuffer,
    sourceMimeType,
    sourceFilename,
    preExtracted,
    hubOverrides,
  } = args;
  const resourceRelId = requirePayloadRelationId(learningResourceId);
  const correlationId = randomUUID();
  const startedAt = new Date().toISOString();

  const run = await payload.create({
    collection: 'ki-processing-runs',
    data: {
      learningResource: resourceRelId,
      status: 'running',
      stages: {
        extract: 'pending',
        normalize: 'pending',
        chunk: 'pending',
        hub: 'pending',
        queue: 'pending',
      },
      chunkCount: 0,
      correlationId,
      startedAt,
    },
    overrideAccess: true,
    req,
    context: { kiPipelineActive: true },
  });

  const markStages = async (stages: Record<string, string>, extra?: Record<string, unknown>) => {
    await payload.update({
      collection: 'ki-processing-runs',
      id: run.id,
      data: { stages, ...extra },
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });
  };

  try {
    const resource = (await payload.findByID({
      collection: 'learning-resources',
      id: learningResourceId,
      depth: 0,
      overrideAccess: true,
      req,
    })) as unknown as Record<string, unknown>;

    const mediaId = relId(resource.media as Rel);
    if (mediaId == null) throw new Error('LEARNING_RESOURCE_MEDIA_MISSING');

    const resourceType = String(resource.resourceType || '');
    if (!isSupportedExtractType(resourceType)) {
      throw new Error(`EXTRACTOR_NOT_IMPLEMENTED:${resourceType}`);
    }

    await payload.update({
      collection: 'learning-resources',
      id: learningResourceId,
      data: { processingStatus: 'extracting', lastError: null },
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });

    let buffer: Buffer;
    let mimeType: string | null;
    let filename: string | null;
    if (sourceBuffer && sourceBuffer.length > 0) {
      buffer = sourceBuffer;
      mimeType = sourceMimeType ?? null;
      filename = sourceFilename ?? null;
    } else {
      const resolved = await resolveMediaBuffer(payload, mediaId);
      buffer = resolved.buffer;
      mimeType = resolved.mimeType;
      filename = resolved.filename;
    }
    const fileHash = sha256Hex(buffer);
    const extracted =
      preExtracted && typeof preExtracted.text === 'string'
        ? {
            text: preExtracted.text,
            meta: {
              pages: (preExtracted.meta.pages as number | null) ?? null,
              byteSize: buffer.length,
              language: (preExtracted.meta.language as string | null) ?? null,
              checksum: fileHash,
              encoding: (preExtracted.meta.encoding as string) ?? 'utf-8',
              mimeType,
              filename,
            },
          }
        : await extractByType(resourceType as KiSupportedExtractType, buffer, {
            mimeType,
            filename,
          });

    if (!extracted.text?.trim()) {
      throw new Error('EXTRACT_EMPTY');
    }

    await markStages({
      extract: 'completed',
      normalize: 'running',
      chunk: 'pending',
      hub: 'pending',
      queue: 'pending',
    });

    await payload.update({
      collection: 'learning-resources',
      id: learningResourceId,
      data: {
        processingStatus: 'normalizing',
        // Não persistir o corpus completo no textarea do Admin (limites/validação Payload).
        extractedText: sanitizeStoredText(
          `extract_ok chars=${extracted.text.length} checksum=${fileHash}\n\n${extracted.text.slice(0, 2000)}`,
          8_000,
        ),
        extractMeta: {
          ...extracted.meta,
          storedPreviewChars: Math.min(2000, extracted.text.length),
          fullTextChars: extracted.text.length,
        },
        fileHash,
        language: (resource.language as string) || extracted.meta.language || 'pt-BR',
      },
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });

    const normalized = normalizeExtractedText(extracted.text);

    await markStages({
      extract: 'completed',
      normalize: 'completed',
      chunk: 'running',
      hub: 'pending',
      queue: 'pending',
    });

    await payload.update({
      collection: 'learning-resources',
      id: learningResourceId,
      data: {
        processingStatus: 'chunking',
        normalizedText: sanitizeStoredText(
          `normalize_ok chars=${normalized.length}\n\n${normalized.slice(0, 2000)}`,
          8_000,
        ),
      },
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });

    await deleteChildrenForResource(payload, learningResourceId, req);

    const chunks = chunkText(normalized);
    if (!chunks.length) throw new Error('CHUNK_EMPTY');

    await markStages(
      {
        extract: 'completed',
        normalize: 'completed',
        chunk: 'completed',
        hub: 'running',
        queue: 'pending',
      },
      { chunkCount: chunks.length },
    );

    await payload.update({
      collection: 'learning-resources',
      id: learningResourceId,
      data: { processingStatus: 'indexing_hub' },
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });

    const title =
      hubOverrides?.title || String(resource.title || `Learning Resource ${learningResourceId}`);
    const baseSlug = `ki-${slugify(title)}-${learningResourceId}`;
    const tags = Array.isArray(resource.tags)
      ? (resource.tags as Array<{ tag?: string }>)
          .map((t) => t.tag)
          .filter((t): t is string => Boolean(t))
      : [];
    const mergedTags = [...new Set([...(hubOverrides?.tags || []), ...tags])];

    let knowledgeDocumentId = relId(resource.knowledgeDocument as Rel);
    const publishForAi = hubOverrides?.allowAiUse === true;
    const hubData = {
      title: publishForAi ? title : `[KI] ${title}`,
      slug: baseSlug,
      summary: normalized.slice(0, 2000),
      sourceType: sourceTypeFor(resourceType),
      file: mediaId,
      language: (resource.language as string) || 'pt-BR',
      ownerCompany:
        toPayloadRelationId(hubOverrides?.ownerCompany) ??
        relId(resource.ownerCompany as Rel) ??
        undefined,
      knowledgeArea: pickUnion(hubOverrides?.knowledgeArea, KNOWLEDGE_AREAS, 'cursos'),
      category: toPayloadRelationId(hubOverrides?.category),
      subcategories: (hubOverrides?.subcategories || [])
        .map((id) => toPayloadRelationId(id))
        .filter((id): id is number => id != null),
      allowedAgents: pickAgentKeys(hubOverrides?.allowedAgents),
      tags: mergedTags.map((tag) => ({ tag })),
      authorName: (resource.author as string) || undefined,
      // Sempre cria em draft; publicação oficial sobe via transições válidas.
      status: 'draft' as const,
      processingStatus: publishForAi ? ('succeeded' as const) : ('queued' as const),
      publicationStatus: publishForAi
        ? ('unpublished' as const)
        : hubOverrides?.publicationStatus || ('unpublished' as const),
      securityClassification: pickUnion(
        hubOverrides?.securityClassification,
        SECURITY_CLASSIFICATIONS,
        'INTERNAL_RESTRICTED',
      ),
      allowAiUse: hubOverrides?.allowAiUse ?? false,
      allowWebPublication: hubOverrides?.allowWebPublication ?? false,
      allowDownload: false,
      requiresEnrollment: false,
      technicalRiskLevel: pickUnion(
        hubOverrides?.technicalRiskLevel,
        TECHNICAL_RISK_LEVELS,
        'high',
      ),
      humanReviewRequired: hubOverrides?.humanReviewRequired ?? true,
      versionNumber: (resource.version as string) || '1.0.0',
      checksum: fileHash,
      revisionNotes:
        hubOverrides?.revisionNotes ||
        `Ingestão automática Knowledge Intelligence (correlation=${correlationId}). Sem embeddings.`,
    };

    const useDraft = !publishForAi;

    if (knowledgeDocumentId != null) {
      await payload.update({
        collection: 'knowledge-documents',
        id: knowledgeDocumentId,
        data: hubData,
        draft: useDraft,
        overrideAccess: true,
        req,
        context: { kiPipelineActive: true, knowledgeOfficialLoad: publishForAi },
      });
    } else {
      // slug conflict → append hash
      try {
        const created = await payload.create({
          collection: 'knowledge-documents',
          data: hubData,
          draft: useDraft,
          overrideAccess: true,
          req,
          context: { kiPipelineActive: true, knowledgeOfficialLoad: publishForAi },
        });
        knowledgeDocumentId = toPayloadRelationId(created.id) ?? null;
      } catch {
        const created = await payload.create({
          collection: 'knowledge-documents',
          data: {
            ...hubData,
            slug: `${baseSlug}-${createHash('sha1').update(String(learningResourceId)).digest('hex').slice(0, 8)}`,
          },
          draft: useDraft,
          overrideAccess: true,
          req,
          context: { kiPipelineActive: true, knowledgeOfficialLoad: publishForAi },
        });
        knowledgeDocumentId = toPayloadRelationId(created.id) ?? null;
      }
    }

    if (publishForAi && knowledgeDocumentId != null) {
      const ctx = { kiPipelineActive: true, knowledgeOfficialLoad: true };
      for (const status of ['in_review', 'approved', 'published'] as const) {
        await payload.update({
          collection: 'knowledge-documents',
          id: knowledgeDocumentId,
          data: {
            status,
            allowAiUse: true,
            publicationStatus: status === 'published' ? 'published' : 'unpublished',
            humanReviewRequired: false,
          },
          draft: false,
          overrideAccess: true,
          req,
          context: ctx,
        });
      }
    }

    await markStages({
      extract: 'completed',
      normalize: 'completed',
      chunk: 'completed',
      hub: 'completed',
      queue: 'running',
    });

    await payload.update({
      collection: 'learning-resources',
      id: learningResourceId,
      data: {
        processingStatus: 'queued',
        knowledgeDocument: toPayloadRelationId(knowledgeDocumentId),
      },
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });

    const courseId = relId(resource.course as Rel);
    const moduleId = relId(resource.module as Rel);
    const lessonId = relId(resource.lesson as Rel);
    const ownerCompanyId =
      toPayloadRelationId(hubOverrides?.ownerCompany) ?? relId(resource.ownerCompany as Rel);
    const instructorId = relId(resource.instructor as Rel);
    const agentTags = (hubOverrides?.allowedAgents || []).map((a) => `agent:${a}`);
    const chunkTags = [...new Set([...mergedTags, ...agentTags])];

    for (const chunk of chunks) {
      const chunkDoc = await payload.create({
        collection: 'knowledge-chunks',
        data: {
          learningResource: resourceRelId,
          knowledgeDocument: toPayloadRelationId(knowledgeDocumentId),
          chunkIndex: chunk.chunkIndex,
          chunkText: chunk.chunkText,
          tokenEstimate: chunk.tokenEstimate,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          course: courseId ?? undefined,
          module: moduleId ?? undefined,
          lesson: lessonId ?? undefined,
          ownerCompany: ownerCompanyId ?? undefined,
          instructor: instructorId ?? undefined,
          language: (resource.language as string) || 'pt-BR',
          version: (resource.version as string) || '1.0.0',
          category:
            (hubOverrides?.knowledgeArea as string) || (resource.category as string) || undefined,
          tags: chunkTags.map((tag) => ({ tag })),
        },
        overrideAccess: true,
        req,
        context: { kiPipelineActive: true },
      });

      await payload.create({
        collection: 'embedding-queue',
        data: {
          learningResource: resourceRelId,
          knowledgeDocument: toPayloadRelationId(knowledgeDocumentId),
          chunk: requirePayloadRelationId(chunkDoc.id),
          status: 'pending',
          attempts: 0,
          provider: process.env.RETRIEVAL_EMBEDDING_PROVIDER || 'deterministic',
          scheduledAt: new Date().toISOString(),
        },
        overrideAccess: true,
        req,
        context: { kiPipelineActive: true },
      });
    }

    const finishedAt = new Date().toISOString();
    await payload.update({
      collection: 'learning-resources',
      id: learningResourceId,
      data: {
        processingStatus: 'completed',
        processedAt: finishedAt,
        lastError: null,
      },
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });

    await payload.update({
      collection: 'ki-processing-runs',
      id: run.id,
      data: {
        status: 'completed',
        chunkCount: chunks.length,
        finishedAt,
        stages: {
          extract: 'completed',
          normalize: 'completed',
          chunk: 'completed',
          hub: 'completed',
          queue: 'completed',
        },
      },
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });

    await refreshKiDashboard(payload);

    payload.logger.info({
      msg: 'ki.pipeline.completed',
      learningResourceId,
      knowledgeDocumentId,
      chunkCount: chunks.length,
      correlationId,
    });

    return {
      ok: true,
      chunkCount: chunks.length,
      knowledgeDocumentId: knowledgeDocumentId ?? undefined,
    };
  } catch (err) {
    const message = sanitizeError(err);
    const finishedAt = new Date().toISOString();
    await payload.update({
      collection: 'learning-resources',
      id: learningResourceId,
      data: {
        processingStatus: 'failed',
        lastError: message,
        processedAt: finishedAt,
      },
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });
    await payload.update({
      collection: 'ki-processing-runs',
      id: run.id,
      data: {
        status: 'failed',
        finishedAt,
        errorCode: 'PIPELINE_FAILED',
        sanitizedError: message,
      },
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });
    await refreshKiDashboard(payload).catch(() => undefined);
    payload.logger.error({
      msg: 'ki.pipeline.failed',
      learningResourceId,
      correlationId,
      error: message,
    });
    return { ok: false, chunkCount: 0 };
  }
}

export async function ensureLearningResourceFromLessonAsset(args: {
  payload: Payload;
  lessonAssetId: string | number;
  req?: PayloadRequest;
  /** Epic 17 default: false — Hub AI ingest requires human approval. */
  process?: boolean;
}): Promise<{ learningResourceId: string | number | null; processed: boolean }> {
  const { payload, lessonAssetId, req, process = false } = args;

  const asset = (await payload.findByID({
    collection: 'lesson-assets',
    id: lessonAssetId,
    depth: 2,
    overrideAccess: true,
    req,
  })) as unknown as Record<string, unknown>;

  const mediaId = relId(asset.media as Rel);
  if (mediaId == null) return { learningResourceId: null, processed: false };

  const media =
    typeof asset.media === 'object' && asset.media
      ? (asset.media as { mimeType?: string; filename?: string })
      : await payload.findByID({
          collection: 'media',
          id: mediaId,
          depth: 0,
          overrideAccess: true,
          req,
        });

  const resourceType = detectResourceType({
    mimeType: media?.mimeType,
    filename: media?.filename,
  });
  if (!resourceType) {
    payload.logger.info({
      msg: 'ki.ingest.skip_unsupported',
      lessonAssetId,
      mimeType: media?.mimeType,
      filename: media?.filename,
    });
    return { learningResourceId: null, processed: false };
  }

  const lessonRel = asset.lesson as Rel;
  const lessonId = relId(lessonRel);
  let moduleId: number | null = null;
  let courseId: number | null = null;
  let ownerCompanyId: number | null = null;
  let instructorId: number | null = null;
  let category: string | null = null;
  let language = 'pt-BR';
  let schoolKey: string | null = null;

  if (lessonId != null) {
    const lesson = (await payload.findByID({
      collection: 'lessons',
      id: lessonId,
      depth: 2,
      overrideAccess: true,
      req,
    })) as unknown as Record<string, unknown>;
    moduleId = relId(lesson.module as Rel);
    if (moduleId != null) {
      const mod = (await payload.findByID({
        collection: 'course-modules',
        id: moduleId,
        depth: 2,
        overrideAccess: true,
        req,
      })) as unknown as Record<string, unknown>;
      courseId = relId(mod.course as Rel);
      if (courseId != null) {
        const course = (await payload.findByID({
          collection: 'courses',
          id: courseId,
          depth: 0,
          overrideAccess: true,
          req,
        })) as unknown as Record<string, unknown>;
        ownerCompanyId = relId(course.ownerCompany as Rel);
        instructorId = relId(course.instructor as Rel);
        category = typeof course.category === 'string' ? course.category : null;
        language = typeof course.language === 'string' ? course.language : 'pt-BR';
        schoolKey = typeof course.schoolKey === 'string' ? course.schoolKey : null;
      }
    }
  }

  const existing = await payload.find({
    collection: 'learning-resources',
    where: { lessonAsset: { equals: lessonAssetId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });

  const data = {
    title: String(asset.title || media?.filename || `Asset ${lessonAssetId}`),
    media: mediaId,
    lessonAsset: requirePayloadRelationId(lessonAssetId),
    lesson: lessonId ?? undefined,
    module: moduleId ?? undefined,
    course: courseId ?? undefined,
    resourceType,
    version: '1.0.0',
    language,
    origin: 'lms_lesson_asset' as const,
    processingStatus: 'pending' as const,
    // Epic 17: LMS academic content stays COURSE_PRIVATE — no auto Hub AI ingest.
    autoProcess: false,
    knowledgeScope: 'COURSE_PRIVATE' as const,
    retrievalEligible: false,
    governanceState: 'COURSE_PRIVATE',
    schoolKey: schoolKey ?? undefined,
    ownerCompany: ownerCompanyId ?? undefined,
    instructor: instructorId ?? undefined,
    category: category ?? undefined,
  };

  let learningResourceId: string | number;
  if (existing.docs[0]) {
    const updated = await payload.update({
      collection: 'learning-resources',
      id: existing.docs[0].id,
      data: {
        ...data,
        processingStatus: 'pending' as const,
      } as never,
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });
    learningResourceId = (updated as { id: string | number }).id;
  } else {
    const created = await payload.create({
      collection: 'learning-resources',
      data: data as never,
      overrideAccess: true,
      req,
      context: { kiPipelineActive: true },
    });
    learningResourceId = created.id;
  }

  if (!process) return { learningResourceId, processed: false };

  const result = await processLearningResource({
    payload,
    learningResourceId,
    req,
  });
  return { learningResourceId, processed: result.ok };
}
