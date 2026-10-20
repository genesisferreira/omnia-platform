/** Competências técnicas padrão Omnia (HVAC-R / refrigeração). */
export const DEFAULT_COMPETENCY_KEYS = [
  'eletricidade',
  'comandos',
  'termodinamica',
  'co2',
  'automacao',
  'hvac',
  'eficiencia-energetica',
] as const;

export type CompetencyKey = (typeof DEFAULT_COMPETENCY_KEYS)[number] | string;

export const COMPETENCY_LABELS: Record<string, string> = {
  eletricidade: 'Eletricidade',
  comandos: 'Comandos',
  termodinamica: 'Termodinâmica',
  co2: 'CO₂',
  automacao: 'Automação',
  hvac: 'HVAC',
  'eficiencia-energetica': 'Eficiência Energética',
};

export type EvidenceSourceType =
  | 'tutor'
  | 'lms'
  | 'assessment'
  | 'exercise'
  | 'study_time'
  | 'question'
  | 'attempt'
  | 'feedback'
  | 'engineering'
  | 'commercial';

export type LearningPreference = 'visual' | 'pratico' | 'textual' | 'analitico' | 'experimental';

export type MotivationGoal =
  'emprego' | 'empresa_propria' | 'co2' | 'industrial' | 'hvac' | 'consultoria' | string;

export type CompetencyState = {
  key: string;
  label: string;
  score: number;
  confidence: number;
  trend: 'up' | 'stable' | 'down';
  lastUpdate: string;
};

export type EvidenceRecord = {
  id?: string;
  sourceType: EvidenceSourceType;
  sourceId: string | null;
  competencyKey: string | null;
  strength: number;
  summary: string;
  payload?: Record<string, unknown>;
  at: string;
  confidence: number;
};

export type PreferenceState = {
  key: LearningPreference;
  score: number;
  confidence: number;
  evidenceCount: number;
};

export type MotivationProfile = {
  goals: MotivationGoal[];
  notes: string | null;
  updatedByStudentAt: string | null;
};

export type SipRecommendation = {
  type: 'study_plan' | 'content' | 'review' | 'course' | 'material' | 'exercise';
  title: string;
  reason: string;
  confidence: number;
  competencyKey?: string | null;
  lessonId?: string | null;
  courseId?: string | null;
};

export type StudentInsights = {
  imt: number;
  learningVelocity: number;
  knowledgeRetention: number;
  confidenceIndex: number;
  reviewRisk: number;
  skillGap: number;
  computedAt: string;
  explainability: Array<{ metric: string; basis: string; confidence: number }>;
};

export type SipDigitalTwin = {
  userKey: string;
  courseId: string | null;
  language: string;
  identification: {
    displayName: string | null;
    technicalLevel: string;
    progressPercent: number;
    studyTimeMinutes: number;
  };
  competencies: CompetencyState[];
  objectives: MotivationProfile;
  learningProfile: {
    preferences: PreferenceState[];
    recommendedLevel: string;
  };
  evidenceSummary: {
    count: number;
    lastEvidenceAt: string | null;
    sources: EvidenceSourceType[];
  };
  recommendations: SipRecommendation[];
  insights: StudentInsights;
  history: Array<{ at: string; event: string; origin: string }>;
  version: number;
  updatedAt: string;
};

/** Resumo seguro para assistentes (sem métricas internas brutas ao aluno). */
export type SipAssistantContext = {
  userKey: string;
  technicalLevel: string;
  topCompetencies: Array<{ key: string; label: string; score: number }>;
  gaps: Array<{ key: string; label: string; score: number }>;
  preferences: LearningPreference[];
  goals: MotivationGoal[];
  nextSteps: string[];
  summaryText: string;
  confidence: number;
  computedAt: string;
};

export type SipAuditEvent = {
  userKey: string;
  courseId: string | null;
  origin: string;
  event: string;
  evidenceIds: string[];
  model: string;
  confidence: number;
  at: string;
  payload?: Record<string, unknown>;
};

export type SipEvidenceInput = {
  progressPercent: number;
  studyTimeMinutes: number;
  completedLessonIds: string[];
  completedModuleIds: string[];
  masteredTopics: string[];
  difficultyTopics: string[];
  pendingTopics: string[];
  aiUsageCount: number;
  avgGrounding: number;
  negativeFeedbackCount: number;
  recentQuestions: Array<{ question: string; groundingScore: number; status: string }>;
  catalogLessonTitles?: string[];
};

export type SipRecalculateInput = {
  userKey: string;
  courseId: string | null;
  language?: string;
  displayName?: string | null;
  evidenceInput: SipEvidenceInput;
  existingCompetencies?: CompetencyState[];
  motivation?: MotivationProfile | null;
  catalogHints?: Array<{ id: string; title: string; competencyKey?: string | null }>;
  now?: string;
};

export type SipRecalculateResult = {
  twin: SipDigitalTwin;
  evidence: EvidenceRecord[];
  audit: SipAuditEvent;
};
