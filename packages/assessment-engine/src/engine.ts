import { AssessmentCache } from './cache/assessment-cache';
import {
  buildAssessmentDescriptor,
  resolveAssessment,
  type BuildAssessmentInput,
} from './resolve';
import {
  createStubAssessmentSecurityPorts,
  type AssessmentSecurityPorts,
} from './security-ports';
import type { AssessmentDescriptor, AssessmentEventType, ResolvedAssessment } from './types';

/** Porta mínima para emitir no Learning Engine (anti-acoplamento). */
export type AssessmentEventSink = {
  emitAssessmentEvent: (
    type: AssessmentEventType,
    payload: Record<string, unknown>,
  ) => void;
  updateContinue?: (pointer: {
    courseId: number;
    activityId: number;
    sectionId?: number | null;
    source?: 'last_seen' | 'progress' | 'explicit';
  }) => void;
};

export type CreateAssessmentEngineOptions = {
  omniaUserId: string;
  sink?: AssessmentEventSink;
  security?: AssessmentSecurityPorts;
  cache?: AssessmentCache;
};

/**
 * Assessment Engine — estado/metadata/status/cache/eventos (read-only).
 * Eventos fluem para o Learning Engine via sink.
 */
export class AssessmentEngine {
  readonly omniaUserId: string;
  private readonly sink?: AssessmentEventSink;
  readonly security: AssessmentSecurityPorts;
  private readonly cache: AssessmentCache;
  private current: ResolvedAssessment | null = null;

  constructor(options: CreateAssessmentEngineOptions) {
    this.omniaUserId = options.omniaUserId;
    this.sink = options.sink;
    this.security = options.security ?? createStubAssessmentSecurityPorts();
    this.cache = options.cache ?? new AssessmentCache();
  }

  getCurrent(): ResolvedAssessment | null {
    return this.current;
  }

  resolveFromInput(input: BuildAssessmentInput): ResolvedAssessment {
    const cacheKey = `assess:${input.courseId}:${input.activityId}`;
    const cached = this.cache.get<ResolvedAssessment>(cacheKey);
    if (cached) return cached;
    const descriptor = buildAssessmentDescriptor(input);
    const resolved = resolveAssessment(descriptor);
    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  open(descriptor: AssessmentDescriptor): ResolvedAssessment {
    const resolved = resolveAssessment(descriptor);
    this.current = resolved;
    this.emit('assessment.opened', {
      courseId: resolved.courseId,
      activityId: resolved.activityId,
      assessmentId: resolved.id,
      type: resolved.type,
    });
    this.emit('assessment.viewed', {
      courseId: resolved.courseId,
      activityId: resolved.activityId,
      assessmentId: resolved.id,
    });
    if (resolved.type === 'quiz') {
      this.emit('quiz.viewed', {
        courseId: resolved.courseId,
        quizId: resolved.activityId,
      });
    }
    if (resolved.type === 'assignment') {
      this.emit('assignment.viewed', {
        courseId: resolved.courseId,
        assignmentId: resolved.activityId,
      });
    }
    this.sink?.updateContinue?.({
      courseId: resolved.courseId,
      activityId: resolved.activityId,
      sectionId: resolved.sectionId,
      source: 'last_seen',
    });
    return resolved;
  }

  viewGrade(resolved: ResolvedAssessment): void {
    if (!resolved.grade?.published) return;
    this.emit('grade.viewed', {
      courseId: resolved.courseId,
      activityId: resolved.activityId,
      percentage: resolved.grade.percentage,
    });
  }

  viewFeedback(resolved: ResolvedAssessment): void {
    if (!resolved.feedback.available) return;
    this.emit('feedback.viewed', {
      courseId: resolved.courseId,
      activityId: resolved.activityId,
    });
  }

  complete(resolved: ResolvedAssessment): void {
    this.emit('assessment.completed', {
      courseId: resolved.courseId,
      activityId: resolved.activityId,
      assessmentId: resolved.id,
    });
    this.sink?.updateContinue?.({
      courseId: resolved.courseId,
      activityId: resolved.activityId,
      sectionId: resolved.sectionId,
      source: 'progress',
    });
  }

  close(resolved: ResolvedAssessment): void {
    this.emit('assessment.closed', {
      courseId: resolved.courseId,
      activityId: resolved.activityId,
      assessmentId: resolved.id,
    });
    this.current = null;
  }

  private emit(type: AssessmentEventType, payload: Record<string, unknown>): void {
    this.sink?.emitAssessmentEvent(type, payload);
  }
}

export function createAssessmentEngine(options: CreateAssessmentEngineOptions): AssessmentEngine {
  return new AssessmentEngine(options);
}
