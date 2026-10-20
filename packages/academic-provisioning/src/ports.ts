import type { IdentityLookupResult, ProvisionResult, WriteCapability } from './types';

export type MoodleWritePort = {
  listWriteCapabilities(): WriteCapability[];
  createUser(input: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    correlationId: string;
  }): Promise<ProvisionResult>;
  updateUser(input: {
    moodleUserId: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    suspended?: boolean;
    correlationId: string;
  }): Promise<ProvisionResult>;
  enrollUser(input: {
    moodleUserId: number;
    moodleCourseId: number;
    roleId?: number;
    correlationId: string;
  }): Promise<ProvisionResult>;
  unenrollUser(input: {
    moodleUserId: number;
    moodleCourseId: number;
    correlationId: string;
  }): Promise<ProvisionResult>;
};

export type IdentityLinkPort = {
  findActive(omniaUserId: string): Promise<IdentityLookupResult>;
};

export type ProvisionAuditPort = {
  record(input: {
    action: string;
    actorId: string;
    targetUserId?: string;
    correlationId: string;
    origin: string;
    result: 'success' | 'failure' | 'deduplicated' | 'dry-run';
    latencyMs: number;
    attempts: number;
    previousValue?: unknown;
    newValue?: unknown;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
};

export type ProvisionMetricsPort = {
  incProvisionSuccess(action: string): void;
  incProvisionFailure(action: string): void;
  incEnrollmentSuccess(action: string): void;
  incEnrollmentFailure(action: string): void;
  incRetry(): void;
  setQueueSize(size: number): void;
  observeLatency(action: string, seconds: number): void;
};
