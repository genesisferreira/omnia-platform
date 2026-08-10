import type { RuntimeAnswer, RuntimeRequest } from '@omnia/neurofrigo-runtime';

export type EngineeringProfile = {
  id: string;
  key: string;
  companyName: string;
  companyId: string | null;
  technicalArea: string;
  specialty: string;
  language: string;
  permissions: string[];
  technologyLines: string[];
  engineeringPolicy: string;
  allowedModelKeys: string[];
  status: 'active' | 'disabled';
};

export type TechnicalHint = {
  equipment?: string | null;
  specialty?: string | null;
  documentCategory?: string | null;
  technologyLine?: string | null;
};

export type TechnicalContext = {
  companyName: string;
  technicalArea: string;
  specialty: string;
  language: string;
  technologyLines: string[];
  permissions: string[];
  engineeringPolicy: string;
  hint: TechnicalHint;
  summaryText: string;
};

export type EngineeringRecommendation = {
  type: 'course' | 'training' | 'document' | 'procedure' | 'norm';
  title: string;
  reason: string;
  sourceChunkId?: string | null;
};

export type EngineeringRecommendations = {
  courses: EngineeringRecommendation[];
  trainings: EngineeringRecommendation[];
  documents: EngineeringRecommendation[];
  procedures: EngineeringRecommendation[];
  norms: EngineeringRecommendation[];
};

export type EngineeringAskRequest = {
  question: string;
  userId?: string | null;
  tenantId?: string | null;
  language?: string | null;
  role?: string | null;
  sessionId?: string | number | null;
  courseId?: string | null;
  courseTitle?: string | null;
  moduleId?: string | null;
  moduleTitle?: string | null;
  lessonId?: string | null;
  lessonTitle?: string | null;
  ownerCompanyId?: string | null;
  companyIds?: Array<string | number>;
  requestTroubleshooting?: boolean;
  requestComparison?: boolean;
  technicalHint?: TechnicalHint | null;
  profileKey?: string | null;
};

export type EngineeringAnswer = {
  answer: RuntimeAnswer;
  sessionId: string | number;
  profile: EngineeringProfile;
  technicalContext: TechnicalContext;
  troubleshootingMarkdown: string | null;
  comparisonMarkdown: string | null;
  recommendations: EngineeringRecommendations;
  wantsTroubleshooting: boolean;
  wantsComparison: boolean;
};

export type RuntimeAskPort = {
  ask: (
    request: RuntimeRequest & { assistantId?: string | null; orchestrate?: boolean },
  ) => Promise<{
    answer: RuntimeAnswer;
    sessionId: string | number;
    assistantKey?: string;
    modelKey?: string | null;
  }>;
};

export type EngineeringProfilePort = {
  loadActive: (key?: string | null) => Promise<EngineeringProfile | null>;
};

export type CourseHintPort = {
  listPublishedTitles: (limit?: number) => Promise<string[]>;
};
