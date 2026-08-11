import type { Payload } from 'payload';
import { chunkChecksum, type VectorRecord } from '@omnia/retrieval';

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
    chunk: Number(args.chunkId) || args.chunkId,
    learningResource: args.resourceId ? Number(args.resourceId) || args.resourceId : null,
    knowledgeDocument: args.documentId ? Number(args.documentId) || args.documentId : null,
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

async function embedChunk(payload: Payload, chunk: ChunkDoc, queueItem: QueueDoc): Promise<void> {
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
        securityClassification?: string | null;
        allowedAgents?: string[] | null;
      };
      allowAiUse = doc.allowAiUse !== false;
      publicationStatus = doc.publicationStatus || publicationStatus;
      status = doc.status || status;
      if (doc.securityClassification === 'INTERNAL_RESTRICTED') {
        allowAiUse = false;
        visibility = 'internal_restricted';
      }
      for (const agent of doc.allowedAgents || []) {
        const tag = `agent:${agent}`;
        if (!tags.includes(tag)) tags.push(tag);
      }
    } catch {
      // Mantém defaults se o documento Hub não existir mais.
    }
  }

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
    ownerCompanyId: relId(chunk.ownerCompany),
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
        await embedChunk(payload, chunk, item);
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
