import type { CollectionAfterChangeHook } from 'payload';

import { enqueueAfterResourceChange } from './reindex';

/**
 * Reindex parcial automático quando Learning Resource muda de versão/conteúdo.
 */
export const learningResourceAfterChangeForRetrieval: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
}) => {
  if (context?.retrievalPipelineActive || context?.kiPipelineActive) return doc;
  if (!doc?.id) return doc;

  const status = doc.processingStatus;
  if (status !== 'completed' && status !== 'queued') return doc;

  const changed =
    !previousDoc ||
    previousDoc.version !== doc.version ||
    previousDoc.normalizedText !== doc.normalizedText ||
    previousDoc.fileHash !== doc.fileHash ||
    previousDoc.knowledgeDocument !== doc.knowledgeDocument;

  if (!changed && previousDoc) return doc;

  const docId =
    typeof doc.knowledgeDocument === 'object' && doc.knowledgeDocument
      ? (doc.knowledgeDocument as { id: number }).id
      : doc.knowledgeDocument;

  await enqueueAfterResourceChange(req.payload, doc.id, docId ?? null).catch((err) => {
    req.payload.logger.error({
      msg: 'retrieval reindex enqueue failed',
      err: err instanceof Error ? err.message : String(err),
    });
  });

  return doc;
};

export const knowledgeChunkAfterChangeForRetrieval: CollectionAfterChangeHook = async ({
  doc,
  req,
  context,
}) => {
  if (context?.retrievalPipelineActive || context?.kiPipelineActive) return doc;
  const resourceId =
    typeof doc.learningResource === 'object' && doc.learningResource
      ? (doc.learningResource as { id: number }).id
      : doc.learningResource;
  if (!resourceId) return doc;

  await enqueueAfterResourceChange(req.payload, resourceId, null).catch(() => undefined);
  return doc;
};
