/**
 * Portas de segurança — Write API / Attempt Lock / Authorization / Secure Submission.
 * Stubs only (Épico D). Sem implementação definitiva.
 */

export type AssessmentAuthorizeRequest = {
  omniaUserId: string;
  courseId: number;
  activityId: number;
  purpose: 'view' | 'attempt' | 'submit';
};

export type AssessmentAuthorizeResult =
  { ok: true; grantId: string } | { ok: false; code: 'NOT_IMPLEMENTED' | 'DENIED'; reason: string };

export type AssessmentAuthorizationPort = {
  authorize(request: AssessmentAuthorizeRequest): Promise<AssessmentAuthorizeResult>;
};

export type AttemptLockRequest = {
  grantId: string;
  activityId: number;
};

export type AttemptLockResult =
  { ok: true; lockId: string } | { ok: false; code: 'NOT_IMPLEMENTED' | 'LOCKED'; reason: string };

export type AttemptLockPort = {
  acquire(request: AttemptLockRequest): Promise<AttemptLockResult>;
};

export type SecureSubmissionRequest = {
  grantId: string;
  payloadHash: string;
};

export type SecureSubmissionResult =
  { ok: true; submissionId: string } | { ok: false; code: 'NOT_IMPLEMENTED'; reason: string };

export type SecureSubmissionPort = {
  submit(request: SecureSubmissionRequest): Promise<SecureSubmissionResult>;
};

export type WriteApiPort = {
  /** Futuro: write Moodle via Connector. */
  enqueueWrite(
    command: string,
    body: Record<string, unknown>,
  ): Promise<{ ok: false; code: 'NOT_IMPLEMENTED' }>;
};

export type AssessmentSecurityPorts = {
  authorization: AssessmentAuthorizationPort;
  attemptLock: AttemptLockPort;
  secureSubmission: SecureSubmissionPort;
  writeApi: WriteApiPort;
};

const REASON = 'Assessment security port reserved — not implemented (read-only epic).';

export function createStubAssessmentSecurityPorts(): AssessmentSecurityPorts {
  return {
    authorization: {
      async authorize() {
        return { ok: false, code: 'NOT_IMPLEMENTED', reason: REASON };
      },
    },
    attemptLock: {
      async acquire() {
        return { ok: false, code: 'NOT_IMPLEMENTED', reason: REASON };
      },
    },
    secureSubmission: {
      async submit() {
        return { ok: false, code: 'NOT_IMPLEMENTED', reason: REASON };
      },
    },
    writeApi: {
      async enqueueWrite() {
        return { ok: false, code: 'NOT_IMPLEMENTED' };
      },
    },
  };
}
