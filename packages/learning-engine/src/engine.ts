import { LearningCache } from './cache/learning-cache';
import { resolveContinueTarget, type ContinueTarget } from './continue/resolve-continue';
import { createLearningEvent } from './events/create-event';
import { createMemoryPersistence } from './persistence';
import { computeProgressPercent, findIncompleteActivityId } from './sync/progress';
import { eventToTimelineItem, groupTimelineByDay } from './timeline/build-timeline';
import type {
  ContinuePointer,
  CourseCompletionSnapshot,
  CourseProgressSnapshot,
  CreateLearningEngineOptions,
  LearningEventEnvelope,
  LearningEventType,
  LearningPersistence,
  LearningStateSnapshot,
  TimelineItem,
} from './types';

type Listener = (event: LearningEventEnvelope) => void;

function stateKey(omniaUserId: string): string {
  return `omnia:lms:engine:state:${omniaUserId}`;
}

function eventsKey(omniaUserId: string): string {
  return `omnia:lms:engine:events:${omniaUserId}`;
}

/**
 * Núcleo Learning Engine — entre Experience e Connector.
 * Persistência injetada (nunca acoplar regra a localStorage).
 */
export class LearningEngine {
  readonly omniaUserId: string;
  private readonly persistence: LearningPersistence;
  private readonly cache: LearningCache;
  private readonly origin: NonNullable<CreateLearningEngineOptions['origin']>;
  private readonly actorRole?: string;
  private readonly tenantId?: string;
  private readonly correlationIdFactory: () => string;
  private readonly now: () => Date;
  private readonly maxTimelineItems: number;
  private readonly maxEvents: number;
  private readonly listeners = new Set<Listener>();

  private continuePointer: ContinuePointer | null = null;
  private progressByCourse: Record<number, CourseProgressSnapshot> = {};
  private completionByCourse: Record<number, CourseCompletionSnapshot> = {};
  private timeline: TimelineItem[] = [];
  private events: LearningEventEnvelope[] = [];
  private updatedAt: string;

  constructor(options: CreateLearningEngineOptions) {
    this.omniaUserId = options.omniaUserId;
    this.persistence = options.persistence ?? createMemoryPersistence();
    this.cache = new LearningCache();
    this.origin = options.origin ?? 'omnia.learning-engine';
    this.actorRole = options.actorRole;
    this.tenantId = options.tenantId;
    this.correlationIdFactory =
      options.correlationIdFactory ?? (() => `corr_${Date.now().toString(36)}`);
    this.now = options.now ?? (() => new Date());
    this.maxTimelineItems = options.maxTimelineItems ?? 100;
    this.maxEvents = options.maxEvents ?? 200;
    this.updatedAt = this.now().toISOString();
    this.hydrate();
  }

  private hydrate(): void {
    try {
      const raw = this.persistence.getItem(stateKey(this.omniaUserId));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LearningStateSnapshot>;
        this.continuePointer = parsed.continuePointer ?? null;
        this.progressByCourse = parsed.progressByCourse ?? {};
        this.completionByCourse = parsed.completionByCourse ?? {};
        this.timeline = parsed.timeline ?? [];
        this.updatedAt = parsed.updatedAt ?? this.updatedAt;
      }
      const rawEvents = this.persistence.getItem(eventsKey(this.omniaUserId));
      if (rawEvents) {
        this.events = JSON.parse(rawEvents) as LearningEventEnvelope[];
      }
    } catch {
      // ignore corrupt storage
    }
  }

  private persist(): void {
    const snapshot = this.getSnapshot();
    this.persistence.setItem(stateKey(this.omniaUserId), JSON.stringify(snapshot));
    this.persistence.setItem(eventsKey(this.omniaUserId), JSON.stringify(this.events));
    this.cache.set(`snapshot:${this.omniaUserId}`, snapshot, 30_000);
  }

  getSnapshot(): LearningStateSnapshot {
    const cached = this.cache.get<LearningStateSnapshot>(`snapshot:${this.omniaUserId}`);
    if (cached) return cached;
    return {
      omniaUserId: this.omniaUserId,
      continuePointer: this.continuePointer,
      progressByCourse: this.progressByCourse,
      completionByCourse: this.completionByCourse,
      timeline: this.timeline,
      updatedAt: this.updatedAt,
    };
  }

  getContinuePointer(): ContinuePointer | null {
    return this.continuePointer;
  }

  getEvents(limit = 50): LearningEventEnvelope[] {
    return this.events.slice(0, limit);
  }

  getTimeline(limit = 40): TimelineItem[] {
    return this.timeline.slice(0, limit);
  }

  getTimelineGrouped() {
    return groupTimelineByDay(this.getTimeline());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(
    type: LearningEventType,
    payload: Record<string, unknown>,
    correlationId?: string,
  ): LearningEventEnvelope {
    const event = createLearningEvent({
      type,
      payload,
      origin: this.origin,
      tenantId: this.tenantId,
      correlationId: correlationId ?? this.correlationIdFactory(),
      timestamp: this.now().toISOString(),
      actor: {
        type: 'user',
        id: this.omniaUserId,
        role: this.actorRole,
      },
    });

    this.events = [event, ...this.events].slice(0, this.maxEvents);
    const item = eventToTimelineItem(event);
    this.timeline = [item, ...this.timeline].slice(0, this.maxTimelineItems);
    this.updatedAt = event.timestamp;
    this.cache.invalidate(`snapshot:${this.omniaUserId}`);
    this.persist();
    for (const listener of this.listeners) listener(event);
    return event;
  }

  updateContinue(
    pointer: Omit<ContinuePointer, 'updatedAt'> & { updatedAt?: string },
    correlationId?: string,
  ): ContinuePointer {
    this.continuePointer = {
      courseId: pointer.courseId,
      activityId: pointer.activityId ?? null,
      sectionId: pointer.sectionId ?? null,
      source: pointer.source ?? 'explicit',
      updatedAt: pointer.updatedAt ?? this.now().toISOString(),
    };
    this.emit(
      'continue.updated',
      {
        courseId: this.continuePointer.courseId,
        activityId: this.continuePointer.activityId,
        sectionId: this.continuePointer.sectionId,
        source: this.continuePointer.source,
      },
      correlationId,
    );
    return this.continuePointer;
  }

  resolveContinue(courses: Array<{ moodleCourseId: number }>): ContinueTarget | null {
    const progressHints: Record<number, { incompleteActivityId?: number | null }> = {};
    for (const [id, snap] of Object.entries(this.progressByCourse)) {
      progressHints[Number(id)] = { incompleteActivityId: snap.incompleteActivityId };
    }
    const target = resolveContinueTarget({
      courses,
      continuePointer: this.continuePointer,
      progressByCourse: progressHints,
    });
    if (target) {
      this.emit('continue.resolved', {
        courseId: target.courseId,
        activityId: target.activityId,
        source: target.source,
      });
    }
    return target;
  }

  syncProgress(
    courseId: number,
    activities: Array<{ moodleActivityId: number; state: number }>,
  ): CourseProgressSnapshot {
    const percent = computeProgressPercent(activities);
    const snap: CourseProgressSnapshot = {
      courseId,
      percent,
      activities,
      incompleteActivityId: findIncompleteActivityId(activities),
      syncedAt: this.now().toISOString(),
    };
    this.progressByCourse = { ...this.progressByCourse, [courseId]: snap };
    this.emit('progress.updated', {
      courseId,
      percent,
      incompleteActivityId: snap.incompleteActivityId,
    });
    return snap;
  }

  syncCompletion(
    courseId: number,
    completion: { completed: boolean; timeCompleted?: string | null },
  ): CourseCompletionSnapshot {
    const snap: CourseCompletionSnapshot = {
      courseId,
      completed: completion.completed,
      timeCompleted: completion.timeCompleted ?? null,
      syncedAt: this.now().toISOString(),
    };
    this.completionByCourse = { ...this.completionByCourse, [courseId]: snap };
    if (completion.completed) {
      this.emit('course.completed', {
        courseId,
        timeCompleted: snap.timeCompleted,
      });
    }
    this.persist();
    return snap;
  }

  openCourse(courseId: number): void {
    this.emit('course.opened', { courseId });
    this.updateContinue({ courseId, activityId: null, sectionId: null, source: 'explicit' });
  }

  openModule(courseId: number, sectionId: number): void {
    this.emit('module.opened', { courseId, sectionId });
  }

  completeModule(courseId: number, sectionId: number): void {
    this.emit('module.completed', { courseId, sectionId });
  }

  openLesson(courseId: number, activityId: number, sectionId?: number | null): void {
    this.emit('lesson.opened', { courseId, activityId, sectionId: sectionId ?? null });
    this.emit('activity.started', { courseId, activityId });
    this.updateContinue({
      courseId,
      activityId,
      sectionId: sectionId ?? null,
      source: 'last_seen',
    });
  }

  closeLesson(courseId: number, activityId: number): void {
    this.emit('lesson.closed', { courseId, activityId });
  }

  completeLesson(courseId: number, activityId: number, state = 1): void {
    this.emit('lesson.completed', { courseId, activityId, state });
    this.emit('activity.completed', { courseId, activityId, state });
  }

  openMaterial(courseId: number, activityId: number, materialId?: string): void {
    this.emit('material.opened', { courseId, activityId, materialId });
    this.updateContinue({
      courseId,
      activityId,
      source: 'last_seen',
    });
  }

  viewMaterial(courseId: number, activityId: number, materialId?: string): void {
    this.emit('material.viewed', { courseId, activityId, materialId });
  }

  completeMaterial(courseId: number, activityId: number, materialId?: string): void {
    this.emit('material.completed', { courseId, activityId, materialId });
    this.updateContinue({
      courseId,
      activityId,
      source: 'progress',
    });
  }

  closeMaterial(courseId: number, activityId: number, materialId?: string): void {
    this.emit('material.closed', { courseId, activityId, materialId });
  }

  /** Bridge Assessment Engine → Event Catalog (read-only). */
  emitAssessmentEvent(
    type:
      | 'assessment.opened'
      | 'assessment.closed'
      | 'assessment.viewed'
      | 'assessment.completed'
      | 'quiz.viewed'
      | 'assignment.viewed'
      | 'grade.viewed'
      | 'feedback.viewed',
    payload: Record<string, unknown>,
  ): void {
    this.emit(type, payload);
  }
}

export function createLearningEngine(options: CreateLearningEngineOptions): LearningEngine {
  return new LearningEngine(options);
}
