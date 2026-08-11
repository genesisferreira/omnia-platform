export const ORCHESTRATOR_INTENTS = [
  'institutional',
  'courses',
  'enrollment',
  'academic',
  'refrigeration',
  'neurofrigo_tech',
  'electrical',
  'assessment',
  'tutoring',
  'radar',
  'lab',
  'content_production',
  'engineering_services',
  'commercial',
  'partnership',
  'support',
  'human_handoff',
  'general',
] as const;
export type OrchestratorIntent = (typeof ORCHESTRATOR_INTENTS)[number];

export const OFFICIAL_SPECIALIST_KEYS = [
  'hvac',
  'neurofrigo-tech',
  'electrical',
  'assessor',
  'tutor',
  'radar',
  'lab',
  'content',
] as const;
export type OfficialSpecialistKey = (typeof OFFICIAL_SPECIALIST_KEYS)[number];

export type ProfileKind =
  'visitor' | 'student' | 'teacher' | 'company' | 'partner' | 'admin' | 'super_admin';

export type GuardDecision =
  { allow: true } | { allow: false; code: string; message: string; event: string };

export type RoutedAgent = {
  assistantKey: string;
  displayName: string;
  intent: OrchestratorIntent;
  reason: string;
};

export type OrchestratorTraceEvent = {
  type: string;
  at: string;
  detail?: Record<string, unknown>;
};

export type OrchestratorPlan = {
  profile: ProfileKind;
  intent: OrchestratorIntent;
  intentConfidence: number;
  agent: RoutedAgent;
  blocked: boolean;
  blockReason: string | null;
  blockCode: string | null;
  events: OrchestratorTraceEvent[];
  assessmentIntegrity: boolean;
};

export type BudgetThresholdAction = 'info' | 'warning' | 'critical' | 'policy';

export type BudgetConfig = {
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  /** Ao atingir 100%, comportamento: allow | warn_only | block */
  at100: 'allow' | 'warn_only' | 'block';
};

export type BudgetSnapshot = {
  spentTodayUsd: number;
  spentMonthUsd: number;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  dailyPct: number;
  monthlyPct: number;
  thresholdsHit: number[];
  action: BudgetThresholdAction | 'ok';
  blocked: boolean;
  message: string | null;
};
