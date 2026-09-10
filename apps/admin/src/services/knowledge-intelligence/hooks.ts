import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload';

import { ensureLearningResourceFromLessonAsset, processLearningResource } from './pipeline';

function isPipelineContext(context: unknown): boolean {
  return Boolean(
    context &&
    typeof context === 'object' &&
    'kiPipelineActive' in context &&
    (context as { kiPipelineActive?: boolean }).kiPipelineActive,
  );
}

export const learningResourceBeforeChange: CollectionBeforeChangeHook = async ({ data }) => data;

export const learningResourceAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
  context,
}) => {
  if (isPipelineContext(context)) return doc;
  if (!doc?.autoProcess) return doc;
  if (doc.processingStatus !== 'pending') return doc;

  if (operation === 'create') {
    void processLearningResource({
      payload: req.payload,
      learningResourceId: doc.id,
      req,
    });
    return doc;
  }

  if (operation === 'update' && previousDoc) {
    const becamePending =
      previousDoc.processingStatus !== 'pending' && doc.processingStatus === 'pending';
    const mediaChanged = String(previousDoc.media) !== String(doc.media);
    if (becamePending || mediaChanged) {
      void processLearningResource({
        payload: req.payload,
        learningResourceId: doc.id,
        req,
      });
    }
  }

  return doc;
};

export const lessonAssetAfterChangeForKi: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
  context,
}) => {
  if (isPipelineContext(context)) return doc;
  if (operation !== 'create' && operation !== 'update') return doc;

  void ensureLearningResourceFromLessonAsset({
    payload: req.payload,
    lessonAssetId: doc.id,
    req,
    // Epic 17: mirror LMS resource only; Hub AI ingest requires human approval.
    process: false,
  });

  return doc;
};
