/**
 * Assessment Engine — tipos (Sprint 2.7 Épico D).
 * Read-only: sem submissão Moodle.
 */

export type AssessmentType = 'quiz' | 'assignment' | 'unknown';

export type AssessmentUiStatus =
  | 'available'
  | 'unavailable'
  | 'in_progress'
  | 'completed'
  | 'grade_published'
  | 'feedback_available';

export type AssessmentPermissions = {
  canView: boolean;
  canAttempt: boolean;
  canSubmit: boolean;
  reason?: string;
};

export type AssessmentGrade = {
  itemName: string;
  gradeFormatted: string | null;
  percentage: number | null;
  published: boolean;
};

export type AssessmentFeedback = {
  available: boolean;
  summary: string | null;
};

export type AssessmentCompletion = {
  completed: boolean;
  state: number;
  timeCompleted?: string | null;
};

export type AssessmentAvailability = {
  available: boolean;
  reason?: string | null;
  dueAt?: string | null;
};

export type AssessmentAttempts = {
  used: number | null;
  max: number | null;
  remaining: number | null;
};

export type AssessmentMetadata = {
  id: string;
  name: string;
  type: AssessmentType;
  description?: string | null;
  instructions?: string | null;
  modName: string;
  statusLabel: string;
  estimatedMinutes?: number | null;
};

export type AssessmentDescriptor = {
  id: string;
  courseId: number;
  activityId: number;
  sectionId?: number | null;
  type: AssessmentType;
  metadata: AssessmentMetadata;
  permissions: AssessmentPermissions;
  availability: AssessmentAvailability;
  attempts: AssessmentAttempts;
  grade: AssessmentGrade | null;
  feedback: AssessmentFeedback;
  completion: AssessmentCompletion;
};

export type ResolvedAssessment = AssessmentDescriptor & {
  uiStatus: AssessmentUiStatus;
  rendererKey: AssessmentType;
};

export type AssessmentEventType =
  | 'assessment.opened'
  | 'assessment.closed'
  | 'assessment.viewed'
  | 'assessment.completed'
  | 'quiz.viewed'
  | 'assignment.viewed'
  | 'grade.viewed'
  | 'feedback.viewed';
