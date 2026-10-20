import type { Payload } from 'payload';
import { isSchoolKey } from '@omnia/intelligent-learning';
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

export type IndexScopeErrorCode =
  | 'INDEX_SCOPE_OWNER_COMPANY_REQUIRED'
  | 'INDEX_SCOPE_COMPANY_NOT_FOUND'
  | 'INDEX_SCOPE_TENANT_UNRESOLVED';

/**
 * Epic 17.3 — the vector's isolation scope (owner company → tenant) could not be resolved.
 * Indexing fails closed: no NULL/wildcard/sentinel scope is ever written to `retrieval_vectors`
 * (the PG pre-filter treats NULL as "visible to every tenant/company").
 */
export class IndexScopeError extends Error {
  constructor(
    readonly code: IndexScopeErrorCode,
    readonly detail: string,
  ) {
    super(`${code}:${detail}`);
    this.name = 'IndexScopeError';
  }
}

/**
 * School content = Knowledge governed for a school (Fred do Frio / CTE). Identified by the
 * governance metadata the vector is built from (KD, or LR when there is no KD):
 * - a valid `schoolKey` (`@omnia/intelligent-learning` SCHOOL_KEYS — set by governed ingest from
 *   the course's school), or
 * - `knowledgeScope === 'SCHOOL_APPROVED'` (school-scoped by definition, even if schoolKey is lost).
 * OMNIA/global catalog content (no schoolKey, scope OMNIA_APPROVED / legacy default) keeps the
 * existing behaviour (ownerCompany optional).
 */
export function isSchoolScopedContent(meta: {
  schoolKey?: string | null;
  knowledgeScope?: string | null;
}): boolean {
  return isSchoolKey(meta.schoolKey) || meta.knowledgeScope === 'SCHOOL_APPROVED';
}

/**
 * Epic 17.3: vectors carry the owner company's **tenant** id (`companies.tenant`), the canonical
 * Tenant ⊃ Company model (TENANT_ARCHITECTURE.md; Omnia tenant 1 ⊃ Fred 4 / CTE 5). Writing the
 * company id here made governed chunks invisible to tenant-scoped searches.
 *
 * Returns `null` only when there is no owner company. A missing company or a company without tenant
 * throws {@link IndexScopeError} (fail closed) — never a guessed/sentinel tenant.
 */
export async function resolveVectorTenantId(
  payload: Payload,
  ownerCompanyId: string | null,
  cache?: Map<string, string>,
): Promise<string | null> {
  if (!ownerCompanyId) return null;
  const cached = cache?.get(ownerCompanyId);
  if (cached) return cached;
  let company: { tenant?: unknown } | null;
  try {
    company = (await payload.findByID({
      collection: 'companies',
      id: ownerCompanyId,
      depth: 0,
      overrideAccess: true,
    })) as { tenant?: unknown } | null;
  } catch (err) {
    const status = (err as { status?: number } | null)?.status;
    if (status !== 404) throw err;
    company = null;
  }
  if (!company) throw new IndexScopeError('INDEX_SCOPE_COMPANY_NOT_FOUND', ownerCompanyId);
  const tenantId = relId(company.tenant);
  if (!tenantId) throw new IndexScopeError('INDEX_SCOPE_TENANT_UNRESOLVED', ownerCompanyId);
  cache?.set(ownerCompanyId, tenantId);
  return tenantId;
}

/**
 * Resolve `{ ownerCompanyId, tenantId }` for a chunk vector, or throw {@link IndexScopeError}.
 * School content requires an owner company (and therefore a tenant).
 */
export async function resolveChunkIndexScope(
  payload: Payload,
  args: {
    ownerCompanyId: string | null;
    schoolKey?: string | null;
    knowledgeScope?: string | null;
  },
  cache?: Map<string, string>,
): Promise<{ ownerCompanyId: string | null; tenantId: string | null }> {
  if (!args.ownerCompanyId) {
    if (isSchoolScopedContent(args)) {
      throw new IndexScopeError(
        'INDEX_SCOPE_OWNER_COMPANY_REQUIRED',
        `school=${args.schoolKey ?? 'none'} scope=${args.knowledgeScope ?? 'none'}`,
      );
    }
    return { ownerCompanyId: null, tenantId: null };
  }
  const tenantId = await resolveVectorTenantId(payload, args.ownerCompanyId, cache);
  return { ownerCompanyId: args.ownerCompanyId, tenantId };
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

type ChunkGovernance = {
  allowAiUse: boolean;
  publicationStatus: string;
  status: string;
  visibility: string;
  schoolKey: string | null;
  knowledgeScope: string | null;
  retrievalEligible: boolean | null;
  assessmentSecret: boolean;
  sourceVersion: string | null;
  agentTags: string[];
};

/** Per-run caches (tenant per owner company; governance per KD/LR). */
type IndexRunContext = {
  tenantCache: Map<string, string>;
  governanceCache: Map<string, ChunkGovernance>;
};

function newIndexRunContext(): IndexRunContext {
  return { tenantCache: new Map(), governanceCache: new Map() };
}

/** Governance/ACL metadata for a chunk vector, from its Knowledge Document (or LR fallback). */
async function loadChunkGovernance(
  payload: Payload,
  documentId: string | null,
  resourceId: string | null,
  fallbackVersion: string | null,
  ctx?: IndexRunContext,
): Promise<ChunkGovernance> {
  const cacheKey = `${documentId ?? ''}|${resourceId ?? ''}|${fallbackVersion ?? ''}`;
  const cached = ctx?.governanceCache.get(cacheKey);
  if (cached) return { ...cached, agentTags: [...cached.agentTags] };

  const g: ChunkGovernance = {
    allowAiUse: true,
    publicationStatus: 'published',
    status: 'published',
    visibility: 'enrolled',
    schoolKey: null,
    knowledgeScope: 'OMNIA_APPROVED',
    retrievalEligible: true,
    assessmentSecret: false,
    sourceVersion: fallbackVersion,
    agentTags: [],
  };

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
      g.allowAiUse = doc.allowAiUse !== false;
      g.publicationStatus = doc.publicationStatus || g.publicationStatus;
      g.status = doc.status || g.status;
      g.visibility = mapSecurityClassificationToVisibility(doc.securityClassification);
      if (doc.securityClassification === 'INTERNAL_RESTRICTED') {
        g.allowAiUse = false;
        g.visibility = 'internal_restricted';
      }
      g.schoolKey = doc.schoolKey ?? null;
      g.knowledgeScope = doc.knowledgeScope ?? g.knowledgeScope;
      g.retrievalEligible = doc.retrievalEligible !== false;
      g.assessmentSecret = doc.assessmentSecret === true;
      g.sourceVersion = doc.contentVersionHash ?? g.sourceVersion;
      const proc = (doc.processingStatus || '').toLowerCase();
      const processingReady =
        !proc ||
        proc === 'succeeded' ||
        proc === 'completed' ||
        proc === 'ready' ||
        proc === 'indexed';
      if (g.assessmentSecret || g.retrievalEligible === false || !processingReady) {
        g.allowAiUse = false;
        g.retrievalEligible = false;
      }
      for (const agent of doc.allowedAgents || []) g.agentTags.push(`agent:${agent}`);
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
      g.schoolKey = lr.schoolKey ?? null;
      g.knowledgeScope = lr.knowledgeScope ?? 'COURSE_PRIVATE';
      g.retrievalEligible = lr.retrievalEligible === true;
      g.assessmentSecret = lr.assessmentSecret === true;
      g.sourceVersion = lr.contentVersionHash ?? g.sourceVersion;
      const proc = (lr.processingStatus || '').toLowerCase();
      const processingReady = proc === 'completed' || proc === 'succeeded' || proc === 'ready';
      // LMS resources without approval or unfinished KI stay non-retrievable in vector ACL.
      if (g.retrievalEligible !== true || g.assessmentSecret || !processingReady) {
        g.allowAiUse = false;
        g.retrievalEligible = false;
      }
    } catch {
      // ignore
    }
  }

  ctx?.governanceCache.set(cacheKey, { ...g, agentTags: [...g.agentTags] });
  return g;
}

type PreparedChunk = {
  chunk: ChunkDoc;
  resourceId: string | null;
  documentId: string | null;
  governance: ChunkGovernance;
  scope: { ownerCompanyId: string | null; tenantId: string | null };
};

/**
 * Resolve everything a chunk vector needs **before** any write (embedding-records / vector store).
 * Throws {@link IndexScopeError} when the isolation scope is unresolvable (fail closed).
 */
async function prepareChunk(
  payload: Payload,
  chunk: ChunkDoc,
  queueItem: QueueDoc,
  ctx: IndexRunContext,
): Promise<PreparedChunk> {
  const resourceId = relId(chunk.learningResource) || relId(queueItem.learningResource);
  const documentId = relId(chunk.knowledgeDocument) || relId(queueItem.knowledgeDocument);
  const governance = await loadChunkGovernance(
    payload,
    documentId,
    resourceId,
    chunk.version ?? null,
    ctx,
  );
  const scope = await resolveChunkIndexScope(
    payload,
    {
      ownerCompanyId: relId(chunk.ownerCompany),
      schoolKey: governance.schoolKey,
      knowledgeScope: governance.knowledgeScope,
    },
    ctx.tenantCache,
  );
  return { chunk, resourceId, documentId, governance, scope };
}

async function embedChunk(
  payload: Payload,
  chunk: ChunkDoc,
  queueItem: QueueDoc,
  ctx: IndexRunContext = newIndexRunContext(),
  prepared?: PreparedChunk,
): Promise<void> {
  const text = String(chunk.chunkText || '');
  if (!text.trim()) throw new Error('Chunk sem texto');
  // Scope first: an unresolvable tenant/owner aborts before anything is written.
  const p = prepared ?? (await prepareChunk(payload, chunk, queueItem, ctx));
  const { resourceId, documentId, governance: g, scope } = p;

  const provider = getEmbeddingProvider();
  const meta = provider.metadata();
  const store = await getVectorStore();
  const checksum = chunkChecksum(text);
  const vectorId = `chunk:${chunk.id}`;

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
  for (const tag of g.agentTags) if (!tags.includes(tag)) tags.push(tag);

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
    ownerCompanyId: scope.ownerCompanyId,
    // Epic 17: tenant isolation on vectors (ACL + governance gate) — tenant id space, not company.
    tenantId: scope.tenantId,
    schoolKey: g.schoolKey,
    knowledgeScope: g.knowledgeScope,
    retrievalEligible: g.retrievalEligible,
    assessmentSecret: g.assessmentSecret,
    sourceVersion: g.sourceVersion,
    language: chunk.language ?? null,
    version: chunk.version ?? null,
    category: chunk.category ?? null,
    tags,
    allowAiUse: g.allowAiUse,
    publicationStatus: g.publicationStatus,
    visibility: g.visibility,
    status: g.status,
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
  const ctx = newIndexRunContext();

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

      // Resolve every chunk's scope first: an unresolvable tenant/owner writes nothing.
      const prepared: PreparedChunk[] = [];
      for (const chunk of chunks) prepared.push(await prepareChunk(payload, chunk, item, ctx));
      for (const p of prepared) {
        await embedChunk(payload, p.chunk, item, ctx, p);
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

/** Move a resource's live embedding records (ready/processing/pending) to a terminal status. */
async function markResourceEmbeddingRecords(
  payload: Payload,
  learningResourceId: string,
  status: 'failed' | 'stale',
  reason: string | null,
): Promise<void> {
  const records = await payload.find({
    collection: 'embedding-records',
    where: {
      and: [
        { learningResource: { equals: requirePayloadRelationId(learningResourceId) } },
        { status: { in: ['ready', 'processing', 'pending'] } },
      ],
    },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  });
  for (const record of records.docs) {
    await payload.update({
      collection: 'embedding-records',
      id: record.id,
      data: { status, lastError: (reason ?? status).slice(0, 500) },
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
 * Failures are recorded in `knowledge-documents.indexingError` (never thrown). Scope is resolved for
 * every chunk before any write; on any failure the resource's vectors are removed (fail closed).
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

    const queueItem: QueueDoc = {
      id: `index:${learningResourceId}`,
      learningResource: learningResourceId,
      knowledgeDocument: knowledgeDocumentId,
    };
    const ctx = newIndexRunContext();
    // Fail closed BEFORE touching the index: every chunk must have a resolvable isolation scope
    // (owner company → companies.tenant; owner company mandatory for school content).
    const prepared: PreparedChunk[] = [];
    for (const chunk of chunks) prepared.push(await prepareChunk(payload, chunk, queueItem, ctx));

    removedVectors = await store.deleteResource(learningResourceId);

    for (const p of prepared) {
      try {
        await embedChunk(payload, p.chunk, queueItem, ctx, p);
      } catch (err) {
        errors.push(`chunk ${p.chunk.id}: ${err instanceof Error ? err.message : String(err)}`);
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

  if (!ok) {
    // Fail closed: a resource that did not fully index keeps no vectors (no partial leftovers, no
    // stale generation) and its embedding records stop claiming `ready`.
    try {
      removedVectors += await (await getVectorStore()).deleteResource(learningResourceId);
      await markResourceEmbeddingRecords(payload, learningResourceId, 'failed', error);
    } catch (err) {
      payload.logger.error({
        msg: 'retrieval.index.rollback_failed',
        learningResourceId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

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
