import type { SipAssistantContext, StudentInsights } from '@omnia/student-intelligence';

export const LEARNING_ACTION_TYPES = [
  'CONTINUE_LESSON',
  'REVIEW_LESSON',
  'REVIEW_TOPIC',
  'NEXT_MODULE',
  'PRACTICE',
  'ASSESSMENT',
  'REVISIT_CONTENT',
  'ASK_TUTOR',
] as const;

export type LearningActionType = (typeof LEARNING_ACTION_TYPES)[number];

export type AdaptivePolicy = {
  key: string;
  version: string;
  minimumCompetencyScore: number;
  reviewThreshold: number;
  assessmentThreshold: number;
  staleKnowledgeDays: number;
  maxRecommendations: number;
  minimumEvidenceCount: number;
  reviewRiskThreshold: number;
  skillGapThreshold: number;
};

export const DEFAULT_ADAPTIVE_POLICY: AdaptivePolicy = {
  key: 'global-default',
  version: '1.0.0',
  minimumCompetencyScore: 0.45,
  reviewThreshold: 0.4,
  assessmentThreshold: 0.7,
  staleKnowledgeDays: 14,
  maxRecommendations: 5,
  minimumEvidenceCount: 2,
  reviewRiskThreshold: 0.6,
  skillGapThreshold: 0.45,
};

export type CatalogLessonRef = {
  id: string;
  title: string;
  slug: string;
  moduleId: string;
  moduleTitle: string;
  order: number;
  moduleOrder: number;
};

export type CatalogModuleRef = {
  id: string;
  title: string;
  slug: string;
  order: number;
  lessonIds: string[];
};

export type AdaptiveCatalog = {
  courseId: string;
  courseTitle: string;
  modules: CatalogModuleRef[];
  lessons: CatalogLessonRef[];
};

export type AdaptiveStudentSnapshot = {
  userKey: string;
  courseId: string;
  sip: SipAssistantContext;
  insights: StudentInsights | null;
  progressPercent: number;
  completedLessonIds: string[];
  completedModuleIds: string[];
  evidenceCount: number;
  difficultyTopics: string[];
  pendingTopics: string[];
  assessmentAvailable: boolean;
  lastActivityAt: string | null;
};

export type DecisionFactor = {
  key: string;
  value: number | string | boolean | null;
  weight: number;
  note: string;
};

export type LearningAction = {
  actionType: LearningActionType;
  reason: string;
  reasonFriendly: string;
  priority: number;
  confidence: number;
  courseId: string | null;
  moduleId: string | null;
  lessonId: string | null;
  lessonSlug: string | null;
  lessonTitle: string | null;
  competencyIds: string[];
  evidenceIds: string[];
  factors: DecisionFactor[];
  expiresAt: string | null;
  createdAt: string;
  policyKey: string;
  policyVersion: string;
};

export type AdaptivePlanStep = {
  order: number;
  when: 'now' | 'next' | 'then';
  action: LearningAction;
};

export type AdaptivePlan = {
  userKey: string;
  courseId: string;
  steps: AdaptivePlanStep[];
  nextBest: LearningAction | null;
  computedAt: string;
  policyKey: string;
  policyVersion: string;
};

export type AdaptiveDecisionRecord = {
  userKey: string;
  courseId: string | null;
  tenantId: string | null;
  decision: LearningAction;
  plan: AdaptivePlan;
  policyVersion: string;
  createdAt: string;
};

/** Ports — adapters admin; package não acessa Payload. */
export type SipContextPort = {
  getContext: (input: {
    userKey: string;
    courseId: string;
  }) => Promise<SipAssistantContext | null>;
  getInsights: (input: {
    userKey: string;
    courseId: string;
  }) => Promise<StudentInsights | null>;
  getProgress: (input: {
    userKey: string;
    courseId: string;
  }) => Promise<{
    progressPercent: number;
    completedLessonIds: string[];
    completedModuleIds: string[];
    evidenceCount: number;
    difficultyTopics: string[];
    pendingTopics: string[];
    lastActivityAt: string | null;
  } | null>;
};

export type CatalogPort = {
  load: (courseId: string) => Promise<AdaptiveCatalog | null>;
};

export type AdaptiveDecisionRepositoryPort = {
  save: (record: AdaptiveDecisionRecord) => Promise<void>;
};

export type AdaptiveDecideRequest = {
  userKey: string;
  courseId: string;
  tenantId?: string | null;
  policy?: AdaptivePolicy | null;
  assessmentAvailable?: boolean;
  now?: string;
};

export type AdaptiveDecideResult = {
  nextBest: LearningAction | null;
  actions: LearningAction[];
  plan: AdaptivePlan;
  policy: AdaptivePolicy;
};
