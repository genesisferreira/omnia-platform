import type { RuntimeAnswer, RuntimeRequest } from '@omnia/neurofrigo-runtime';

export type CommercialProfile = {
  id: string;
  key: string;
  companyName: string;
  companyId: string | null;
  segment: string;
  region: string;
  language: string;
  allowedCatalog: string[];
  businessLines: string[];
  commercialPolicy: string;
  allowedModelKeys: string[];
  status: 'active' | 'disabled';
};

export type SalesClientHint = {
  segment?: string | null;
  region?: string | null;
  companyName?: string | null;
  productLine?: string | null;
};

export type SalesContext = {
  companyName: string;
  segment: string;
  region: string;
  language: string;
  businessLines: string[];
  allowedCatalog: string[];
  commercialPolicy: string;
  clientHint: SalesClientHint;
  summaryText: string;
};

export type CommercialRecommendation = {
  type: 'product' | 'service' | 'course' | 'training' | 'consulting';
  title: string;
  reason: string;
  sourceChunkId?: string | null;
};

export type CommercialRecommendations = {
  products: CommercialRecommendation[];
  services: CommercialRecommendation[];
  courses: CommercialRecommendation[];
  trainings: CommercialRecommendation[];
  consulting: CommercialRecommendation[];
};

export type CommercialAskRequest = {
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
  /** Força geração de proposta mesmo sem keyword. */
  requestProposal?: boolean;
  clientHint?: SalesClientHint | null;
  profileKey?: string | null;
};

export type CommercialAnswer = {
  answer: RuntimeAnswer;
  sessionId: string | number;
  profile: CommercialProfile;
  salesContext: SalesContext;
  proposalMarkdown: string | null;
  recommendations: CommercialRecommendations;
  wantsProposal: boolean;
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

export type CommercialProfilePort = {
  loadActive: (key?: string | null) => Promise<CommercialProfile | null>;
};

export type CourseHintPort = {
  listPublishedTitles: (limit?: number) => Promise<string[]>;
};
