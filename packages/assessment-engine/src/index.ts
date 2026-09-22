export type {
  AssessmentAttempts,
  AssessmentAvailability,
  AssessmentCompletion,
  AssessmentDescriptor,
  AssessmentEventType,
  AssessmentFeedback,
  AssessmentGrade,
  AssessmentMetadata,
  AssessmentPermissions,
  AssessmentType,
  AssessmentUiStatus,
  ResolvedAssessment,
} from './types';

export { AssessmentCache } from './cache/assessment-cache';
export {
  buildAssessmentDescriptor,
  detectAssessmentType,
  isAssessmentMod,
  resolveAssessment,
  resolveUiStatus,
  statusLabel,
  type BuildAssessmentInput,
} from './resolve';
export {
  createStubAssessmentSecurityPorts,
  type AssessmentSecurityPorts,
  type AssessmentAuthorizationPort,
  type AttemptLockPort,
  type SecureSubmissionPort,
  type WriteApiPort,
} from './security-ports';
export {
  AssessmentEngine,
  createAssessmentEngine,
  type AssessmentEventSink,
  type CreateAssessmentEngineOptions,
} from './engine';
export {
  gradeAttempt,
  gradeObjectiveQuestion,
  studentSafeQuestion,
  type NativeAnswer,
  type NativeQuestion,
  type NativeQuestionType,
} from './native-grade';
