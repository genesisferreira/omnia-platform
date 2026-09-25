import type { Payload } from 'payload';
import { chunkChecksum, type VectorRecord } from '@omnia/retrieval';

import { requirePayloadRelationId, toPayloadRelationId } from '../../lib/payload-relation-id';

import {
  getEmbeddingProvider,
  getMaxEmbeddingAttempts,
  getRetrievalProviderName,
  getVectorStore,
} from './runtime';
import { refreshRetrievalDashboard } from './dashboard';

function relId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'object' && value && 'id' in value) {
    return String((value as { id: string | number }).id);
  }
  return String(value);
}

/** Map Knowledge Hub securityClassification → retrieval visibility (ACL channel). */
function mapSecurityClassificationToVisibility(classification: string | null | undefined): string {
  switch ((classification || '').toUpperCase()) {
    case 'PUBLIC':
      return 'public';
    case 'STUDENT':
      return 'enrolled';
    case 'TEACHER_MANAGER':
    case 'CLIENT_PARTNER':
    case 'INTERNAL':
      return 'internal';
    case 'INTERNAL_RESTRICTED':
      return 'internal_restricted';
    default:
      return 'enrolled';
  }
}

/**
 * Sentinel written to `tenant_id` when a chunk has an owner company without a resolvable tenant.
 * Never equals a real `tenants.id`, so tenant-scoped searches fail closed instead of colliding
 * with an unrelated tenant whose id happens to equal the company id.
 */
export const UNRESOLVED_TENANT_PREFIX = 'unresolved-company:';

/**
 * Epic 17.3: vectors must carry the owner company's **tenant** id (`companies.tenant`), the same id
 * space used by every search subject (`users.tenant` → `tenants`). Writing the company id here made
 * governed chunks invisible to tenant-scoped searches (company 4 ≠ tenant 5).
 */
export async function resolveVectorTenantId(
  payload: Payload,
  ownerCompanyId: string | null,
  cache?: Map<string, string | null>,
): Promise<string | null> {
  if (!ownerCompanyId) return null;
  if (cache?.has(ownerCompanyId)) return cache.get(ownerCompanyId) ?? null;
  let tenantId: string | null;
  try {
    const company = (await payload.findByID({
      collection: 'companies',
      id: ownerCompanyId,
      depth: 0,
      overrideAccess: true,
    })) as { tenant?: unknown } | null;
    tenantId = relId(company?.tenant) ?? `${UNRESOLVED_TENANT_PREFIX}${ownerCompanyId}`;
  } catch (err) {
    const status = (err as { status?: number } | null)?.status;
    if (status !== 404) throw err;
    tenantId = `${UNRESOLVED_TENANT_PREFIX}${ownerCompanyId}`;
  }
  cache?.set(ownerCompanyId, tenantId);
  return tenantId;
}

type QueueDoc = {
  id: string | number;
  status?: string;
  attempts?: number | null;
  learningResource?: unknown;
  knowledgeDocument?: unknown;
  chunk?: unknown;
  lastError?: string | null;
};

type ChunkDoc = {
  id: string | number;
  chunkText?: string | null;
  tokenEstimate?: number | null;
  learningResource?: unknown;
  knowledgeDocument?: unknown;
  course?: unknown;
  module?: unknown;
  lesson?: unknown;
  ownerCompany?: unknown;
  language?: string | null;
  version?: string | null;
  category?: string | null;
  tags?: Array<{ tag?: string | null }> | null;
};

async function loadChunksForQueueItem(payload: Payload, item: QueueDoc): Promise<ChunkDoc[]> {
  const chunkId = relId(item.chunk);
  if (chunkId) {
    const doc = await payload.findByID({
      collection: 'knowledge-chunks',
      id: chunkId,
      depth: 0,
      overrideAccess: true,
    });
    return [doc as ChunkDoc];
  }

  const resourceId = relId(item.learningResource);
  if (!resourceId) return [];

  const found = await payload.find({
    collection: 'knowledge-chunks',
    where: { learningResource: { equals: resourceId } },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  });
  return found.docs as ChunkDoc[];
}

async function upsertEmbeddingRecord(
  payload: Payload,
  args: {
    chunkId: string;
    resourceId: string | null;
    documentId: string | null;
    provider: string;
    model: string;
    dimensions: number;
    checksum: string;
    status: 'ready' | 'failed' | 'processing';
    vectorId: string | null;
    version: string;
    lastError?: string | null;
  },
) {
  const existing = await payload.find({
    collection: 'embedding-records',
    where: {
      and: [
        { chunk: { equals: args.chunkId } },
        { provider: { equals: args.provider } },
        { model: { equals: args.model } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const data = {
    chunk: requirePayloadRelationId(args.chunkId),
    learningResource: toPayloadRelationId(args.resourceId) ?? null,
    knowledgeDocument: toPayloadRelationId(args.documentId) ?? null,
    provider: args.provider,
    model: args.model,
    dimensions: args.dimensions,
    checksum: args.checksum,
    status: args.status,
    version: args.version,
    vectorId: args.vectorId,
    lastError: args.lastError ?? null,
  };

  if (existing.docs[0]) {
    await payload.update({
      collection: 'embedding-records',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
      context: { retrievalPipelineActive: true },
    });
    return existing.docs[0].id;
  }

  const created = await payload.create({
    collection: 'embedding-records',
    data,
    overrideAccess: true,
    context: { retrievalPipelineActive: true },
  });
  return created.id;
}

async function embedChunk(
  payload: Payload,
  chunk: ChunkDoc,
  queueItem: QueueDoc,
  tenantCache?: Map<string, string | null>,
): Promise<void> {
  const provider = getEmbeddingProvider();
  const meta = provider.metadata();
  const store = await getVectorStore();
  const text = String(chunk.chunkText || '');
  if (!text.trim()) throw new Error('Chunk sem texto');

  const checksum = chunkChecksum(text);
  const vectorId = `chunk:${chunk.id}`;
  const resourceId = relId(chunk.learningResource) || relId(queueItem.learningResource);
  const documentId = relId(chunk.knowledgeDocument) || relId(queueItem.knowledgeDocument);

  await upsertEmbeddingRecord(payload, {
    chunkId: String(chunk.id),
    resourceId,
    documentId,
    provider: meta.name,
    model: meta.model,
    dimensions: meta.dimensions,
    checksum,
    status: 'processing',
    vectorId,
    version: String(chunk.version || '1'),
  });

  const embedding = await provider.generate(text);
  const tags = (chunk.tags || []).map((t) => t.tag).filter(Boolean) as string[];

  let allowAiUse = true;
  let publicationStatus = 'published';
  let status = 'published';
  let visibility = 'enrolled';
  let schoolKey: string | null = null;
  let knowledgeScope: string | null = 'OMNIA_APPROVED';
  let retrievalEligible: boolean | null = true;
  let assessmentSecret = false;
  let sourceVersion: string | null = chunk.version ?? null;

  if (documentId != null) {
    try {
      const doc = (await payload.findByID({
        collection: 'knowledge-documents',
        id: documentId,
        depth: 0,
        overrideAccess: true,
      })) as {
        allowAiUse?: boolean | null;
        publicationStatus?: string | null;
        status?: string | null;
        processingStatus?: string | null;
        securityClassification?: string | null;
        allowedAgents?: string[] | null;
        schoolKey?: string | null;
        knowledgeScope?: string | null;
        retrievalEligible?: boolean | null;
        assessmentSecret?: boolean | null;
        contentVersionHash?: string | null;
      };
      allowAiUse = doc.allowAiUse !== false;
      publicationStatus = doc.publicationStatus || publicationStatus;
      status = doc.status || status;
      visibility = mapSecurityClassificationToVisibility(doc.securityClassification);
      if (doc.securityClassification === 'INTERNAL_RESTRICTED') {
        allowAiUse = false;
        visibility = 'internal_restricted';
      }
      schoolKey = doc.schoolKey ?? null;
      knowledgeScope = doc.knowledgeScope ?? knowledgeScope;
      retrievalEligible = doc.retrievalEligible !== false;
      assessmentSecret = doc.assessmentSecret === true;
      sourceVersion = doc.contentVersionHash ?? sourceVersion;
      const proc = (doc.processingStatus || '').toLowerCase();
      const processingReady =
        !proc ||
        proc === 'succeeded' ||
        proc === 'completed' ||
        proc === 'ready' ||
        proc === 'indexed';
      if (assessmentSecret || retrievalEligible === false || !processingReady) {
        allowAiUse = false;
        retrievalEligible = false;
      }
      for (const agent of doc.allowedAgents || []) {
        const tag = `agent:${agent}`;
        if (!tags.includes(tag)) tags.push(tag);
      }
    } catch {
      // Mantém defaults se o documento Hub não existir mais.
    }
  } else if (resourceId != null) {
    try {
      const lr = (await payload.findByID({
        collection: 'learning-resources',
        id: resourceId,
        depth: 0,
        overrideAccess: true,
      })) as {
        schoolKey?: string | null;
        knowledgeScope?: string | null;
        retrievalEligible?: boolean | null;
        assessmentSecret?: boolean | null;
        contentVersionHash?: string | null;
        processingStatus?: string | null;
      };
      schoolKey = lr.schoolKey ?? null;
      knowledgeScope = lr.knowledgeScope ?? 'COURSE_PRIVATE';
      retrievalEligible = lr.retrievalEligible === true;
      assessmentSecret = lr.assessmentSecret === true;
      sourceVersion = lr.contentVersionHash ?? sourceVersion;
      const proc = (lr.processingStatus || '').toLowerCase();
      const processingReady = proc === 'completed' || proc === 'succeeded' || proc === 'ready';
      // LMS resources without approval or unfinished KI stay non-retrievable in vector ACL.
      if (retrievalEligible !== true || assessmentSecret || !processingReady) {
        allowAiUse = false;
        retrievalEligible = false;
      }
    } catch {
      // ignore
    }
  }

  const ownerCompanyId = relId(chunk.ownerCompany);
  const tenantId = await resolveVectorTenantId(payload, ownerCompanyId, tenantCache);
  const record: VectorRecord = {
    id: vectorId,
    chunkId: String(chunk.id),
    embedding,
    text,
    tokenEstimate: Number(chunk.tokenEstimate || Math.ceil(text.length / 4)),
    knowledgeDocumentId: documentId,
    learningResourceId: resourceId,
    courseId: relId(chunk.course),
    moduleId: relId(chunk.module),
    lessonId: relId(chunk.lesson),
    ownerCompanyId,
    // Epic 17: tenant isolation on vectors (ACL + governance gate) — tenant id space, not company.
    tenantId,
    schoolKey,
    knowledgeScope,
    retrievalEligible,
    assessmentSecret,
    sourceVersion,
    language: chunk.language ?? null,
    version: chunk.version ?? null,
    category: chunk.category ?? null,
    tags,
    allowAiUse,
    publicationStatus,
    visibility,
    status,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await store.update(record);

  await upsertEmbeddingRecord(payload, {
    chunkId: String(chunk.id),
    resourceId,
    documentId,
    provider: meta.name,
    model: meta.model,
    dimensions: meta.dimensions,
    checksum,
    status: 'ready',
    vectorId,
    version: String(chunk.version || '1'),
  });
}

export type WorkerResult = {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
};

/**
 * Worker da fila embedding-queue.
 * Pending → Processing → Embedding → Vector → Completed | Failed
 */
export async function processEmbeddingQueue(
  payload: Payload,
  opts: { limit?: number } = {},
): Promise<WorkerResult> {
  const limit = opts.limit ?? 20;
  const maxAttempts = getMaxEmbeddingAttempts();
  const providerName = getRetrievalProviderName();

  const pending = await payload.find({
    collection: 'embedding-queue',
    where: { status: { equals: 'pending' } },
    sort: 'createdAt',
    limit,
    depth: 0,
    overrideAccess: true,
  });

  const result: WorkerResult = { processed: 0, completed: 0, failed: 0, skipped: 0 };
  const tenantCache = new Map<string, string | null>();

  for (const raw of pending.docs) {
    const item = raw as QueueDoc;
    result.processed += 1;
    const attempts = Number(item.attempts || 0) + 1;

    await payload.update({
      collection: 'embedding-queue',
      id: item.id,
      data: {
        status: 'processing',
        attempts,
        provider: providerName,
        lastError: null,
      },
      overrideAccess: true,
      context: { retrievalPipelineActive: true },
    });

    try {
      const chunks = await loadChunksForQueueItem(payload, item);
      if (!chunks.length) {
        throw new Error('Nenhum chunk encontrado para o item da fila');
      }

      for (const chunk of chunks) {
        await embedChunk(payload, chunk, item, tenantCache);
      }

      await payload.update({
        collection: 'embedding-queue',
        id: item.id,
        data: {
          status: 'completed',
          provider: providerName,
          completedAt: new Date().toISOString(),
          lastError: null,
        },
        overrideAccess: true,
        context: { retrievalPipelineActive: true },
      });
      result.completed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 500) : 'embed failed';
      const status = attempts >= maxAttempts ? 'failed' : 'pending';
      await payload.update({
        collection: 'embedding-queue',
        id: item.id,
        data: {
          status,
          provider: providerName,
          lastError: message,
          scheduledAt: status === 'pending' ? new Date(Date.now() + 30_000).toISOString() : null,
        },
        overrideAccess: true,
        context: { retrievalPipelineActive: true },
      });
      if (status === 'failed') result.failed += 1;
      else result.skipped += 1;
    }
  }

  await refreshRetrievalDashboard(payload).catch(() => undefined);
  return result;
}

export type IndexLearningResourceResult = {
  ok: boolean;
  learningResourceId: string;
  knowledgeDocumentId: string | null;
  chunkCount: number;
  indexedCount: number;
  removedVectors: number;
  provider: string | null;
  model: string | null;
  lastIndexedAt: string | null;
  error: string | null;
};

async function settleQueueItemsForResource(
  payload: Payload,
  learningResourceId: string,
  outcome: { ok: true } | { ok: false; error: string } | { deindexed: string },
): Promise<void> {
  const maxAttempts = getMaxEmbeddingAttempts();
  const items = await payload.find({
    collection: 'embedding-queue',
    where: {
      and: [
        { learningResource: { equals: requirePayloadRelationId(learningResourceId) } },
        { status: { in: ['pending', 'processing'] } },
      ],
    },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  });
  const now = new Date().toISOString();
  for (const raw of items.docs) {
    const item = raw as QueueDoc;
    let data: Record<string, unknown>;
    if ('deindexed' in outcome) {
      data = { status: 'failed', lastError: `DEINDEXED:${outcome.deindexed}`.slice(0, 500) };
    } else if (outcome.ok) {
      data = { status: 'completed', completedAt: now, lastError: null };
    } else {
      const attempts = Number(item.attempts || 0) + 1;
      const status = attempts >= maxAttempts ? 'failed' : 'pending';
      data = {
        status,
        attempts,
        lastError: outcome.error.slice(0, 500),
        scheduledAt: status === 'pending' ? new Date(Date.now() + 30_000).toISOString() : null,
      };
    }
    await payload.update({
      collection: 'embedding-queue',
      id: item.id,
      data: data as never,
      overrideAccess: true,
      context: { retrievalPipelineActive: true },
    });
  }
}

/**
 * Epic 17.3 — indexing port for one Learning Resource (used by governed ingest).
 *
 * Reuses the existing indexer (`embedChunk` → VectorStorePort → embedding-records), scoped to the
 * resource instead of the global FIFO queue drain. Idempotent: vectors of the resource are purged
 * first (stale chunk generations from retries), then every current chunk is upserted under the
 * stable id `chunk:<id>`. Success is verified against `embedding-records` (status=ready for every
 * chunk with the active provider/model) and only then `knowledge-documents.lastIndexedAt` is set.
 * Failures are recorded in `knowledge-documents.indexingError` (never thrown).
 */
export async function indexLearningResource(
  payload: Payload,
  args: { learningResourceId: string | number; knowledgeDocumentId?: string | number | null },
): Promise<IndexLearningResourceResult> {
  const learningResourceId = String(args.learningResourceId);
  const knowledgeDocumentId =
    args.knowledgeDocumentId != null ? String(args.knowledgeDocumentId) : null;
  const errors: string[] = [];
  let chunkCount = 0;
  let indexedCount = 0;
  let removedVectors = 0;
  let providerName: string | null = null;
  let modelName: string | null = null;

  try {
    const meta = getEmbeddingProvider().metadata();
    providerName = meta.name;
    modelName = meta.model;
    const store = await getVectorStore();
    const chunks = await loadChunksForQueueItem(payload, {
      id: `index:${learningResourceId}`,
      learningResource: learningResourceId,
    });
    chunkCount = chunks.length;
    if (!chunkCount) throw new Error('INDEX_NO_CHUNKS');

    removedVectors = await store.deleteResource(learningResourceId);

    const tenantCache = new Map<string, string | null>();
    for (const chunk of chunks) {
      try {
        await embedChunk(
          payload,
          chunk,
          {
            id: `index:${learningResourceId}`,
            learningResource: learningResourceId,
            knowledgeDocument: knowledgeDocumentId,
          },
          tenantCache,
        );
      } catch (err) {
        errors.push(`chunk ${chunk.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const chunkIds = chunks.map((c) => requirePayloadRelationId(c.id));
    const ready = await payload.find({
      collection: 'embedding-records',
      where: {
        and: [
          { chunk: { in: chunkIds } },
          { status: { equals: 'ready' } },
          { provider: { equals: meta.name } },
          { model: { equals: meta.model } },
        ],
      },
      limit: chunkIds.length + 50,
      depth: 0,
      overrideAccess: true,
    });
    const readyChunks = new Set(
      (ready.docs as Array<{ chunk?: unknown }>).map((d) => relId(d.chunk)).filter(Boolean),
    );
    indexedCount = chunks.filter((c) => readyChunks.has(String(c.id))).length;
    if (indexedCount !== chunkCount && errors.length === 0) {
      errors.push(`INDEX_INCOMPLETE:${indexedCount}/${chunkCount}`);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const ok = errors.length === 0;
  const error = ok ? null : errors.join(' | ').slice(0, 800);
  const lastIndexedAt = ok ? new Date().toISOString() : null;

  try {
    await settleQueueItemsForResource(
      payload,
      learningResourceId,
      ok ? { ok: true } : { ok: false, error: error ?? 'INDEX_FAILED' },
    );
  } catch (err) {
    payload.logger.warn({
      msg: 'retrieval.index.queue_settle_failed',
      learningResourceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (knowledgeDocumentId != null) {
    try {
      await payload.update({
        collection: 'knowledge-documents',
        id: knowledgeDocumentId,
        data: { lastIndexedAt, indexingError: error } as never,
        overrideAccess: true,
        context: {
          retrievalPipelineActive: true,
          kiPipelineActive: true,
          governancePipelineActive: true,
        },
      });
    } catch (err) {
      payload.logger.error({
        msg: 'retrieval.index.kd_status_write_failed',
        knowledgeDocumentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await refreshRetrievalDashboard(payload).catch(() => undefined);

  return {
    ok,
    learningResourceId,
    knowledgeDocumentId,
    chunkCount,
    indexedCount,
    removedVectors,
    provider: providerName,
    model: modelName,
    lastIndexedAt,
    error,
  };
}

/**
 * Epic 17.3 — remove a resource/document from the vector index (revocation, version change,
 * non-eligible governance states). Marks embedding-records stale, cancels pending queue items and
 * clears `lastIndexedAt` so the KD never claims to be indexed after removal.
 */
export async function deindexLearningResource(
  payload: Payload,
  args: {
    learningResourceId?: string | number | null;
    knowledgeDocumentId?: string | number | null;
    reason: string;
  },
): Promise<{ removedVectors: number }> {
  const learningResourceId =
    args.learningResourceId != null ? String(args.learningResourceId) : null;
  const knowledgeDocumentId =
    args.knowledgeDocumentId != null ? String(args.knowledgeDocumentId) : null;
  const store = await getVectorStore();
  let removedVectors = 0;
  if (learningResourceId) removedVectors += await store.deleteResource(learningResourceId);
  if (knowledgeDocumentId) removedVectors += await store.deleteDocument(knowledgeDocumentId);

  const or: Record<string, unknown>[] = [];
  if (learningResourceId) {
    or.push({ learningResource: { equals: requirePayloadRelationId(learningResourceId) } });
  }
  if (knowledgeDocumentId) {
    or.push({ knowledgeDocument: { equals: requirePayloadRelationId(knowledgeDocumentId) } });
  }
  if (or.length) {
    const records = await payload.find({
      collection: 'embedding-records',
      where: { and: [{ or }, { status: { in: ['ready', 'processing', 'pending'] } }] } as never,
      limit: 5000,
      depth: 0,
      overrideAccess: true,
    });
    for (const record of records.docs) {
      await payload.update({
        collection: 'embedding-records',
        id: record.id,
        data: { status: 'stale', lastError: `DEINDEXED:${args.reason}`.slice(0, 500) },
        overrideAccess: true,
        context: { retrievalPipelineActive: true },
      });
    }
  }

  if (learningResourceId) {
    await settleQueueItemsForResource(payload, learningResourceId, { deindexed: args.reason });
  }

  if (knowledgeDocumentId) {
    await payload.update({
      collection: 'knowledge-documents',
      id: knowledgeDocumentId,
      data: { lastIndexedAt: null, indexingError: null } as never,
      overrideAccess: true,
      context: {
        retrievalPipelineActive: true,
        kiPipelineActive: true,
        governancePipelineActive: true,
      },
    });
  }

  await refreshRetrievalDashboard(payload).catch(() => undefined);
  return { removedVectors };
}
