import type { Payload } from 'payload';

import { getVectorStore } from './runtime';
import { refreshRetrievalDashboard } from './dashboard';

async function enqueueResource(
  payload: Payload,
  resourceId: string | number,
  knowledgeDocumentId?: string | number | null,
) {
  const existing = await payload.find({
    collection: 'embedding-queue',
    where: {
      and: [
        { learningResource: { equals: resourceId } },
        { status: { in: ['pending', 'processing'] } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.docs[0]) {
    await payload.update({
      collection: 'embedding-queue',
      id: existing.docs[0].id,
      data: {
        status: 'pending',
        knowledgeDocument: knowledgeDocumentId ?? existing.docs[0].knowledgeDocument,
        lastError: null,
      },
      overrideAccess: true,
      context: { retrievalPipelineActive: true },
    });
    return existing.docs[0].id;
  }

  const created = await payload.create({
    collection: 'embedding-queue',
    data: {
      learningResource: resourceId,
      knowledgeDocument: knowledgeDocumentId ?? undefined,
      status: 'pending',
      attempts: 0,
      provider: process.env.RETRIEVAL_EMBEDDING_PROVIDER || 'deterministic',
      scheduledAt: new Date().toISOString(),
    },
    overrideAccess: true,
    context: { retrievalPipelineActive: true },
  });
  return created.id;
}

export type ReindexMode = 'full' | 'partial' | 'document';

export async function reindex(args: {
  payload: Payload;
  mode: ReindexMode;
  learningResourceId?: string | number;
  knowledgeDocumentId?: string | number;
}): Promise<{ enqueued: number; deletedVectors: number }> {
  const { payload, mode } = args;
  const store = await getVectorStore();
  let enqueued = 0;
  let deletedVectors = 0;

  if (mode === 'document') {
    if (!args.knowledgeDocumentId) throw new Error('knowledgeDocumentId obrigatório');
    deletedVectors = await store.deleteDocument(String(args.knowledgeDocumentId));
    const resources = await payload.find({
      collection: 'learning-resources',
      where: { knowledgeDocument: { equals: args.knowledgeDocumentId } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    });
    for (const r of resources.docs) {
      await enqueueResource(payload, r.id, args.knowledgeDocumentId);
      enqueued += 1;
    }
  } else if (mode === 'partial') {
    if (!args.learningResourceId) throw new Error('learningResourceId obrigatório');
    deletedVectors = await store.deleteResource(String(args.learningResourceId));
    const resource = await payload.findByID({
      collection: 'learning-resources',
      id: args.learningResourceId,
      depth: 0,
      overrideAccess: true,
    });
    await enqueueResource(
      payload,
      resource.id,
      resource.knowledgeDocument
        ? typeof resource.knowledgeDocument === 'object'
          ? (resource.knowledgeDocument as { id: number }).id
          : resource.knowledgeDocument
        : null,
    );
    enqueued = 1;
  } else {
    // full
    const resources = await payload.find({
      collection: 'learning-resources',
      where: { processingStatus: { equals: 'completed' } },
      limit: 5000,
      depth: 0,
      overrideAccess: true,
    });
    for (const r of resources.docs) {
      if (r.knowledgeDocument) {
        const docId =
          typeof r.knowledgeDocument === 'object'
            ? (r.knowledgeDocument as { id: number }).id
            : r.knowledgeDocument;
        deletedVectors += await store.deleteResource(String(r.id));
        await enqueueResource(payload, r.id, docId);
        enqueued += 1;
      }
    }
  }

  const dash = await payload.findGlobal({
    slug: 'retrieval-dashboard',
    overrideAccess: true,
  });
  await payload.updateGlobal({
    slug: 'retrieval-dashboard',
    data: {
      reindexCount: Number(dash.reindexCount || 0) + 1,
      lastActivitySummary: `reindex ${mode}: enqueued=${enqueued}`,
      lastRefreshAt: new Date().toISOString(),
    },
    overrideAccess: true,
  });

  await refreshRetrievalDashboard(payload).catch(() => undefined);
  return { enqueued, deletedVectors };
}

export async function enqueueAfterResourceChange(
  payload: Payload,
  resourceId: string | number,
  knowledgeDocumentId?: string | number | null,
) {
  await reindex({
    payload,
    mode: 'partial',
    learningResourceId: resourceId,
    knowledgeDocumentId: knowledgeDocumentId ?? undefined,
  });
}
