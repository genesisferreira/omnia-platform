import type {
  IdentityLinkPort,
  MoodleWritePort,
  ProvisionAuditPort,
  ProvisionMetricsPort,
} from './ports';
import { IdentitySync } from './identity-sync';
import type { ProvisionQueue } from './queue';
import { assertProvisionRole, requireCorrelationId, requireIdempotencyKey } from './security';
import type { EnrollmentCommand, ProvisionResult } from './types';

export type EnrollmentServiceOptions = {
  write: MoodleWritePort;
  identity: IdentityLinkPort;
  audit: ProvisionAuditPort;
  metrics?: ProvisionMetricsPort | null;
  queue?: ProvisionQueue | null;
  forceDryRun?: boolean;
};

/**
 * Lifecycle de matrícula: enroll / unenroll / suspend / reactivate / sync.
 * Dry-run forçado neste épico.
 */
export class EnrollmentService {
  private readonly write: MoodleWritePort;
  private readonly identity: IdentitySync;
  private readonly audit: ProvisionAuditPort;
  private readonly metrics: ProvisionMetricsPort | null;
  private readonly queue: ProvisionQueue | null;
  private readonly forceDryRun: boolean;

  constructor(options: EnrollmentServiceOptions) {
    this.write = options.write;
    this.identity = new IdentitySync(options.identity);
    this.audit = options.audit;
    this.metrics = options.metrics ?? null;
    this.queue = options.queue ?? null;
    this.forceDryRun = options.forceDryRun !== false;
  }

  async handleEnrollment(command: EnrollmentCommand): Promise<ProvisionResult> {
    const started = Date.now();
    assertProvisionRole(command.actor);
    const idempotencyKey = requireIdempotencyKey(command.idempotencyKey);
    const correlationId = requireCorrelationId(command.correlationId);

    if (!Number.isFinite(command.moodleCourseId) || command.moodleCourseId <= 0) {
      return {
        ok: false,
        mode: 'dry-run',
        action: command.action,
        idempotencyKey,
        correlationId,
        code: 'INVALID_COURSE_ID',
        message: 'moodleCourseId must be a positive number',
        latencyMs: Date.now() - started,
        attempts: 1,
      };
    }

    if (this.queue) {
      const { job, deduplicated } = await this.queue.register({
        type: 'enrollment',
        action: command.action,
        payload: { ...command, idempotencyKey, correlationId },
        correlationId,
        idempotencyKey,
      });
      this.metrics?.setQueueSize(await this.queue.size());
      if (deduplicated) {
        await this.audit.record({
          action: `enrollment.${command.action}`,
          actorId: command.actor.omniaUserId,
          targetUserId: command.omniaUserId,
          correlationId,
          origin: command.actor.origin,
          result: 'deduplicated',
          latencyMs: Date.now() - started,
          attempts: job.attempts,
          metadata: { jobId: job.id },
        });
        return {
          ok: true,
          mode: 'dry-run',
          action: command.action,
          idempotencyKey,
          correlationId,
          jobId: job.id,
          deduplicated: true,
          latencyMs: Date.now() - started,
          attempts: job.attempts,
          simulated: job.result?.simulated ?? { status: job.status },
        };
      }

      try {
        const result = await this.executeEnrollment({
          ...command,
          idempotencyKey,
          correlationId,
        });
        const latencyMs = Date.now() - started;
        const final: ProvisionResult = {
          ...result,
          jobId: job.id,
          latencyMs,
          attempts: result.attempts || 1,
        };
        await this.queue.complete(job.id, final);

        await this.audit.record({
          action: `enrollment.${command.action}`,
          actorId: command.actor.omniaUserId,
          targetUserId: command.omniaUserId,
          correlationId,
          origin: command.actor.origin,
          result: final.ok ? (this.forceDryRun ? 'dry-run' : 'success') : 'failure',
          latencyMs,
          attempts: final.attempts,
          newValue: final.simulated,
          reason: final.message ?? null,
          metadata: {
            moodleCourseId: command.moodleCourseId,
            mode: final.mode,
            jobId: job.id,
          },
        });

        if (final.ok) this.metrics?.incEnrollmentSuccess(command.action);
        else this.metrics?.incEnrollmentFailure(command.action);
        this.metrics?.observeLatency(`enrollment.${command.action}`, latencyMs / 1000);

        return final;
      } catch (err) {
        const latencyMs = Date.now() - started;
        const message = err instanceof Error ? err.message : String(err);
        this.metrics?.incEnrollmentFailure(command.action);
        this.metrics?.incRetry();
        await this.queue.fail(job.id, message);
        await this.audit.record({
          action: `enrollment.${command.action}`,
          actorId: command.actor.omniaUserId,
          targetUserId: command.omniaUserId,
          correlationId,
          origin: command.actor.origin,
          result: 'failure',
          latencyMs,
          attempts: 1,
          reason: message,
        });
        return {
          ok: false,
          mode: 'dry-run',
          action: command.action,
          idempotencyKey,
          correlationId,
          jobId: job.id,
          code: (err as { code?: string })?.code ?? 'ENROLLMENT_ERROR',
          message,
          latencyMs,
          attempts: 1,
        };
      }
    }

    try {
      const result = await this.executeEnrollment({
        ...command,
        idempotencyKey,
        correlationId,
      });
      const latencyMs = Date.now() - started;
      const final: ProvisionResult = { ...result, latencyMs, attempts: result.attempts || 1 };

      await this.audit.record({
        action: `enrollment.${command.action}`,
        actorId: command.actor.omniaUserId,
        targetUserId: command.omniaUserId,
        correlationId,
        origin: command.actor.origin,
        result: final.ok ? (this.forceDryRun ? 'dry-run' : 'success') : 'failure',
        latencyMs,
        attempts: final.attempts,
        newValue: final.simulated,
        reason: final.message ?? null,
        metadata: {
          moodleCourseId: command.moodleCourseId,
          mode: final.mode,
        },
      });

      if (final.ok) this.metrics?.incEnrollmentSuccess(command.action);
      else this.metrics?.incEnrollmentFailure(command.action);
      this.metrics?.observeLatency(`enrollment.${command.action}`, latencyMs / 1000);

      return final;
    } catch (err) {
      const latencyMs = Date.now() - started;
      const message = err instanceof Error ? err.message : String(err);
      this.metrics?.incEnrollmentFailure(command.action);
      await this.audit.record({
        action: `enrollment.${command.action}`,
        actorId: command.actor.omniaUserId,
        targetUserId: command.omniaUserId,
        correlationId,
        origin: command.actor.origin,
        result: 'failure',
        latencyMs,
        attempts: 1,
        reason: message,
      });
      return {
        ok: false,
        mode: 'dry-run',
        action: command.action,
        idempotencyKey,
        correlationId,
        code: (err as { code?: string })?.code ?? 'ENROLLMENT_ERROR',
        message,
        latencyMs,
        attempts: 1,
      };
    }
  }

  private async resolveMoodleUserId(command: EnrollmentCommand): Promise<number | null> {
    if (command.moodleUserId != null) return command.moodleUserId;
    const link = await this.identity.resolveExisting(command.omniaUserId);
    return link.moodleUserId ?? null;
  }

  private async executeEnrollment(command: EnrollmentCommand): Promise<ProvisionResult> {
    void this.forceDryRun;
    const moodleUserId = await this.resolveMoodleUserId(command);
    if (moodleUserId == null) {
      return {
        ok: false,
        mode: 'dry-run',
        action: command.action,
        idempotencyKey: command.idempotencyKey,
        correlationId: command.correlationId,
        code: 'MOODLE_USER_REQUIRED',
        message: 'moodleUserId or active identity link required for enrollment',
        latencyMs: 0,
        attempts: 1,
      };
    }

    if (command.action === 'unenroll') {
      return this.write.unenrollUser({
        moodleUserId,
        moodleCourseId: command.moodleCourseId,
        correlationId: command.correlationId,
      });
    }

    // enroll | suspend | reactivate | sync → enroll path (dry-run payload)
    // suspend/reactivate mapeiam para update enrol status no futuro; dry-run simula
    if (command.action === 'suspend' || command.action === 'reactivate') {
      return {
        ok: true,
        mode: 'dry-run',
        action: command.action,
        idempotencyKey: command.idempotencyKey,
        correlationId: command.correlationId,
        latencyMs: 0,
        attempts: 1,
        code: 'EXECUTE_DISABLED_UNTIL_ACTIVATION',
        simulated: {
          moodleUserId,
          moodleCourseId: command.moodleCourseId,
          intendedStatus: command.action === 'suspend' ? 'suspended' : 'active',
          note: 'dry-run: enrollment status change not sent to Moodle',
        },
      };
    }

    return this.write.enrollUser({
      moodleUserId,
      moodleCourseId: command.moodleCourseId,
      roleId: command.roleId,
      correlationId: command.correlationId,
    });
  }
}
