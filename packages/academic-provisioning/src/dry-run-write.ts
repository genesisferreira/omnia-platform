import type { MoodleWritePort } from './ports';
import type { ProvisionResult, WriteCapability } from './types';

export const WRITE_CAPABILITIES: WriteCapability[] = [
  {
    functionName: 'core_user_create_users',
    purpose: 'Create Moodle users',
    available: true,
    note: 'dry-run only until activation',
  },
  {
    functionName: 'core_user_update_users',
    purpose: 'Update / suspend Moodle users',
    available: true,
    note: 'dry-run only until activation',
  },
  {
    functionName: 'enrol_manual_enrol_users',
    purpose: 'Manual enroll users in courses',
    available: true,
    note: 'dry-run only until activation',
  },
  {
    functionName: 'enrol_manual_unenrol_users',
    purpose: 'Manual unenroll users from courses',
    available: true,
    note: 'dry-run only until activation',
  },
];

/**
 * Porta Moodle write que sempre retorna dry-run (sem HTTP).
 * Usada em testes e como fallback seguro.
 */
export function createDryRunMoodleWritePort(): MoodleWritePort {
  const base = (
    action: string,
    simulated: Record<string, unknown>,
    correlationId: string,
  ): ProvisionResult => ({
    ok: true,
    mode: 'dry-run',
    action,
    idempotencyKey: '',
    correlationId,
    latencyMs: 0,
    attempts: 1,
    code: 'EXECUTE_DISABLED_UNTIL_ACTIVATION',
    simulated: { ...simulated, mode: 'dry-run' },
  });

  return {
    listWriteCapabilities: () => WRITE_CAPABILITIES,
    async createUser(input) {
      return {
        ...base('create', { username: input.username, email: input.email }, input.correlationId),
        action: 'create',
      };
    },
    async updateUser(input) {
      return {
        ...base(
          'update',
          {
            moodleUserId: input.moodleUserId,
            suspended: input.suspended,
            email: input.email,
          },
          input.correlationId,
        ),
        action: 'update',
      };
    },
    async enrollUser(input) {
      return {
        ...base(
          'enroll',
          {
            moodleUserId: input.moodleUserId,
            moodleCourseId: input.moodleCourseId,
            roleId: input.roleId ?? 5,
          },
          input.correlationId,
        ),
        action: 'enroll',
      };
    },
    async unenrollUser(input) {
      return {
        ...base(
          'unenroll',
          {
            moodleUserId: input.moodleUserId,
            moodleCourseId: input.moodleCourseId,
          },
          input.correlationId,
        ),
        action: 'unenroll',
      };
    },
  };
}
