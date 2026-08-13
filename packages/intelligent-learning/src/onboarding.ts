export const ONBOARDING_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'REVIEW_REQUIRED',
  'EXEMPTED',
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const ONBOARDING_STEPS = [
  'explanation',
  'consent',
  'pcar',
  'goals',
  'assessment',
  'result',
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function isOnboardingStatus(value: unknown): value is OnboardingStatus {
  return ONBOARDING_STATUSES.includes(value as OnboardingStatus);
}

export function academicAccessAllowed(status: OnboardingStatus | null | undefined): boolean {
  return status === 'COMPLETED' || status === 'EXEMPTED';
}

const GATED_ALLOW = [
  '/aluno/onboarding',
  '/aluno/privacidade',
  '/login',
  '/logout',
  '/api/auth',
  '/unauthorized',
];

/** Paths permitidos enquanto o gate de first-login está ativo (aluno). */
export function isAllowedWhileGated(path: string): boolean {
  const p = path.split('?')[0] || '/';
  if (GATED_ALLOW.some((a) => p === a || p.startsWith(`${a}/`))) return true;
  if (p.startsWith('/api/academic/ils/')) return true;
  if (p.startsWith('/api/academic/onboarding')) return true;
  return false;
}

export function nextOnboardingStep(input: {
  status: OnboardingStatus;
  hasConsent: boolean;
  hasPcar: boolean;
  hasGoals: boolean;
  hasAssessment: boolean;
}): OnboardingStep {
  if (input.status === 'COMPLETED' || input.status === 'EXEMPTED') return 'result';
  if (!input.hasConsent) return input.status === 'NOT_STARTED' ? 'explanation' : 'consent';
  if (!input.hasPcar) return 'pcar';
  if (!input.hasGoals) return 'goals';
  if (!input.hasAssessment) return 'assessment';
  return 'result';
}

export function applyOnboardingTransition(
  current: OnboardingStatus,
  action: 'start' | 'complete' | 'review' | 'exempt',
): OnboardingStatus {
  if (action === 'exempt') return 'EXEMPTED';
  if (action === 'complete') return 'COMPLETED';
  if (action === 'review') return 'REVIEW_REQUIRED';
  if (current === 'NOT_STARTED' || current === 'REVIEW_REQUIRED') return 'IN_PROGRESS';
  return current;
}

export function requireOverrideReason(reason: unknown): string {
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < 8) {
    throw new Error('OVERRIDE_REASON_REQUIRED');
  }
  return text;
}
