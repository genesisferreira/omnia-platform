/**
 * Academic Provisioning — tipos (Sprint 3.0 Épico A).
 * Dry-run forçado: zero mutações Moodle neste épico.
 */

export type ProvisionMode = 'dry-run' | 'execute';

export type ProvisionUserAction =
  | 'create'
  | 'update'
  | 'disable'
  | 'enable'
  | 'sync';

export type EnrollmentAction =
  | 'enroll'
  | 'unenroll'
  | 'suspend'
  | 'reactivate'
  | 'sync';

export type ProvisionJobStatus =
  | 'queued'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'dead_letter';

export type ProvisionActor = {
  omniaUserId: string;
  role: string;
  origin: 'omnia.admin' | 'omnia.internal' | 'system';
};

export type ProvisionUserCommand = {
  action: ProvisionUserAction;
  omniaUserId: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  moodleUserId?: number | null;
  idempotencyKey: string;
  correlationId: string;
  actor: ProvisionActor;
};

export type EnrollmentCommand = {
  action: EnrollmentAction;
  omniaUserId: string;
  moodleUserId?: number | null;
  moodleCourseId: number;
  roleId?: number;
  idempotencyKey: string;
  correlationId: string;
  actor: ProvisionActor;
};

export type ProvisionResult = {
  ok: boolean;
  mode: ProvisionMode;
  action: string;
  idempotencyKey: string;
  correlationId: string;
  jobId?: string;
  simulated?: Record<string, unknown>;
  code?: string;
  message?: string;
  latencyMs: number;
  attempts: number;
  deduplicated?: boolean;
};

export type ProvisionJob = {
  id: string;
  type: 'user' | 'enrollment';
  action: string;
  payload: Record<string, unknown>;
  status: ProvisionJobStatus;
  attempts: number;
  maxAttempts: number;
  nextRunAt: number;
  createdAt: number;
  updatedAt: number;
  correlationId: string;
  idempotencyKey: string;
  lastError?: string | null;
  result?: ProvisionResult | null;
};

export type IdentityLookupResult = {
  exists: boolean;
  moodleUserId?: number | null;
  status?: string | null;
};

export type WriteCapability = {
  functionName: string;
  purpose: string;
  available: boolean;
  note?: string;
};
