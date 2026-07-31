/**
 * Tipos do Learning Engine (Sprint 2.7 — Épico A).
 * Alinhado a OMNIA_LMS_DOMAIN_MODEL + OMNIA_LMS_EVENT_CATALOG.
 */

export type LearningOrigin =
  | 'omnia.web'
  | 'omnia.admin'
  | 'omnia.connector'
  | 'moodle'
  | 'neurofrigo'
  | 'system'
  | 'omnia.learning-engine';

export type LearningActor = {
  type: 'user' | 'system';
  id: string;
  role?: string;
};

/** Tipos mínimos exigidos pelo Épico A + aliases do catálogo. */
export type LearningEventType =
  | 'lesson.opened'
  | 'lesson.closed'
  | 'lesson.completed'
  | 'module.opened'
  | 'module.completed'
  | 'material.opened'
  | 'material.closed'
  | 'material.viewed'
  | 'material.completed'
  | 'assessment.opened'
  | 'assessment.closed'
  | 'assessment.viewed'
  | 'assessment.completed'
  | 'quiz.viewed'
  | 'assignment.viewed'
  | 'grade.viewed'
  | 'feedback.viewed'
  | 'activity.started'
  | 'activity.completed'
  | 'progress.updated'
  | 'continue.updated'
  | 'course.completed'
  | 'course.opened'
  | 'continue.resolved';

export type LearningEventEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  {
    eventId: string;
    type: LearningEventType;
    timestamp: string;
    actor: LearningActor;
    origin: LearningOrigin;
    correlationId: string;
    payload: TPayload;
    tenantId?: string;
    schemaVersion: number;
  };

export type ContinuePointer = {
  courseId: number;
  activityId?: number | null;
  sectionId?: number | null;
  updatedAt: string;
  source?: 'last_seen' | 'progress' | 'enrollment' | 'explicit';
};

export type ActivityProgressState = {
  moodleActivityId: number;
  state: number;
};

export type CourseProgressSnapshot = {
  courseId: number;
  percent: number;
  activities: ActivityProgressState[];
  incompleteActivityId?: number | null;
  syncedAt: string;
};

export type CourseCompletionSnapshot = {
  courseId: number;
  completed: boolean;
  timeCompleted?: string | null;
  syncedAt: string;
};

export type TimelineItemKind =
  | 'lesson'
  | 'module'
  | 'material'
  | 'quiz'
  | 'activity'
  | 'completion'
  | 'progress'
  | 'continue';

export type TimelineItem = {
  id: string;
  kind: TimelineItemKind;
  title: string;
  timestamp: string;
  courseId?: number;
  activityId?: number | null;
  sectionId?: number | null;
  eventType?: LearningEventType;
  meta?: Record<string, unknown>;
};

export type LearningStateSnapshot = {
  omniaUserId: string;
  continuePointer: ContinuePointer | null;
  progressByCourse: Record<number, CourseProgressSnapshot>;
  completionByCourse: Record<number, CourseCompletionSnapshot>;
  timeline: TimelineItem[];
  updatedAt: string;
};

/** Porta de persistência — a UI injeta localStorage; testes usam memória. */
export type LearningPersistence = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

export type CreateLearningEngineOptions = {
  omniaUserId: string;
  actorRole?: string;
  tenantId?: string;
  origin?: LearningOrigin;
  persistence?: LearningPersistence;
  correlationIdFactory?: () => string;
  now?: () => Date;
  maxTimelineItems?: number;
  maxEvents?: number;
};
