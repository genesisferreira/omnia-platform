import type { RuntimeAnswer, RuntimeRequest } from '@omnia/neurofrigo-runtime';

export const LEARNING_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'specialist',
] as const;
export type LearningLevel = (typeof LEARNING_LEVELS)[number];

export const LEVEL_LABELS: Record<LearningLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  specialist: 'Especialista',
};

/** Perfil do aluno derivado do LMS (snapshot cacheável). */
export type StudentProfile = {
  userId: string;
  tenantId: string | null;
  enrolledCourseIds: string[];
  progressPercent: number;
  completedModuleIds: string[];
  completedLessonIds: string[];
  lastActivityAt: string | null;
  studyTimeMinutes: number;
  language: string;
  courseId: string | null;
};

/** Indicadores de aprendizagem (atualização automática). */
export type LearningProfile = {
  userId: string;
  courseId: string | null;
  level: LearningLevel;
  masteredTopics: string[];
  pendingTopics: string[];
  reviewedTopics: string[];
  difficultyTopics: string[];
  aiUsageCount: number;
  avgGrounding: number;
  negativeFeedbackCount: number;
  repeatedQuestions: string[];
};

export type CatalogLesson = {
  id: string;
  title: string;
  slug: string;
  moduleId: string;
  moduleTitle: string;
  order: number;
  moduleOrder: number;
  summary?: string | null;
};

export type CatalogModule = {
  id: string;
  title: string;
  slug: string;
  order: number;
  lessons: CatalogLesson[];
};

export type CourseCatalog = {
  courseId: string;
  courseTitle: string;
  modules: CatalogModule[];
  lessons: CatalogLesson[];
};

export type StudyRecommendation = {
  type: 'next_lesson' | 'related_module' | 'complementary' | 'review';
  title: string;
  reason: string;
  courseId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  lessonSlug?: string | null;
  moduleSlug?: string | null;
};

export type StudyPlanStep = {
  order: number;
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
  rationale: string;
};

export type StudyPlan = {
  objective: string;
  courseId: string;
  courseTitle: string;
  steps: StudyPlanStep[];
  estimatedLessons: number;
};

export type LearningGap = {
  topic: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestedLessonId?: string | null;
  suggestedLessonTitle?: string | null;
};

export type TutorAskRequest = {
  question: string;
  userId?: string | null;
  tenantId?: string | null;
  language?: string | null;
  role?: string | null;
  sessionId?: string | number | null;
  courseId: string;
  courseTitle?: string | null;
  moduleId?: string | null;
  moduleTitle?: string | null;
  lessonId?: string | null;
  lessonTitle?: string | null;
  lessonObjectives?: string | null;
  ownerCompanyId?: string | null;
  /** Se true, tenta gerar plano a partir do objetivo na pergunta. */
  requestStudyPlan?: boolean;
  objective?: string | null;
};

export type TutorAnswer = {
  answer: RuntimeAnswer;
  sessionId: string | number;
  level: LearningLevel;
  levelLabel: string;
  student: StudentProfile;
  learning: LearningProfile;
  recommendations: StudyRecommendation[];
  studyPlan: StudyPlan | null;
  gaps: LearningGap[];
  encouragement: string;
  personalizedHint: string;
};

export type TutorAskPort = {
  ask: (
    request: RuntimeRequest,
  ) => Promise<{ answer: RuntimeAnswer; sessionId: string | number }>;
};

export type StudentProfilePort = {
  getOrSync: (input: {
    userId: string;
    tenantId?: string | null;
    courseId: string;
    language?: string | null;
  }) => Promise<StudentProfile>;
};

export type LearningProfilePort = {
  getOrSync: (input: {
    userId: string;
    courseId: string;
    student: StudentProfile;
  }) => Promise<LearningProfile>;
  recordUsage: (input: {
    userId: string;
    courseId: string;
    question: string;
    groundingScore: number;
    confidence: number;
    status: string;
  }) => Promise<void>;
};

export type CourseCatalogPort = {
  load: (courseId: string) => Promise<CourseCatalog | null>;
};

export type AiSignalsPort = {
  listRecentQuestions: (input: {
    userId: string;
    courseId: string;
    limit?: number;
  }) => Promise<Array<{ question: string; groundingScore: number; status: string }>>;
  countNegativeFeedback: (input: { userId: string; courseId: string }) => Promise<number>;
};
