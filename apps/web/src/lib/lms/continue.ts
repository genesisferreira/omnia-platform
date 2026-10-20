/**
 * Adapter Experience → Learning Engine.
 * Regras de Continue/Progress vivem em @omnia/learning-engine (não localStorage direto).
 */
export {
  computeProgressPercent,
  createBrowserPersistence,
  createLearningEngine,
  createMemoryPersistence,
  resolveContinueTarget,
  type ContinuePointer,
  type ContinueTarget,
} from '@omnia/learning-engine';

/** @deprecated Use ContinuePointer — mantido para smoke tests legados. */
export type LmsLastSeen = {
  courseId: number;
  activityId?: number | null;
  sectionId?: number | null;
  updatedAt: string;
};
