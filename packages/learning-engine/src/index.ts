export type {
  ActivityProgressState,
  ContinuePointer,
  CourseCompletionSnapshot,
  CourseProgressSnapshot,
  CreateLearningEngineOptions,
  LearningActor,
  LearningEventEnvelope,
  LearningEventType,
  LearningOrigin,
  LearningPersistence,
  LearningStateSnapshot,
  TimelineItem,
  TimelineItemKind,
} from './types';

export { LearningCache } from './cache/learning-cache';
export { resolveContinueTarget, type ContinueTarget, type ResolveContinueInput } from './continue/resolve-continue';
export { createEventId, createLearningEvent, LEARNING_EVENT_TYPES } from './events/create-event';
export { createLearningEngine, LearningEngine } from './engine';
export { createBrowserPersistence, createMemoryPersistence } from './persistence';
export {
  computeProgressPercent,
  findIncompleteActivityId,
  progressStatus,
} from './sync/progress';
export { eventToTimelineItem, groupTimelineByDay } from './timeline/build-timeline';
