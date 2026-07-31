import type {
  LearningActor,
  LearningEventEnvelope,
  LearningEventType,
  LearningOrigin,
} from '../types';

export type EmitLearningEventInput = {
  type: LearningEventType;
  actor: LearningActor;
  origin: LearningOrigin;
  payload: Record<string, unknown>;
  correlationId: string;
  tenantId?: string;
  eventId?: string;
  timestamp?: string;
  schemaVersion?: number;
};

export function createEventId(now = Date.now()): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `evt_${now.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createLearningEvent(
  input: EmitLearningEventInput,
): LearningEventEnvelope {
  return {
    eventId: input.eventId ?? createEventId(),
    type: input.type,
    timestamp: input.timestamp ?? new Date().toISOString(),
    actor: input.actor,
    origin: input.origin,
    correlationId: input.correlationId,
    payload: input.payload,
    tenantId: input.tenantId,
    schemaVersion: input.schemaVersion ?? 1,
  };
}

export const LEARNING_EVENT_TYPES: LearningEventType[] = [
  'lesson.opened',
  'lesson.closed',
  'lesson.completed',
  'module.opened',
  'module.completed',
  'material.opened',
  'material.closed',
  'material.viewed',
  'material.completed',
  'assessment.opened',
  'assessment.closed',
  'assessment.viewed',
  'assessment.completed',
  'quiz.viewed',
  'assignment.viewed',
  'grade.viewed',
  'feedback.viewed',
  'activity.started',
  'activity.completed',
  'progress.updated',
  'continue.updated',
  'course.completed',
  'course.opened',
  'continue.resolved',
];
