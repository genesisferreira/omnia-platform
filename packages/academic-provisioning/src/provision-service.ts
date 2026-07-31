import type {
  IdentityLinkPort,
  MoodleWritePort,
  ProvisionAuditPort,
  ProvisionMetricsPort,
} from './ports';
import { IdentitySync } from './identity-sync';
import type { ProvisionQueue } from './queue';
import { assertProvisionRole, requireCorrelationId, requireIdempotencyKey } from './security';
import type { ProvisionResult, ProvisionUserCommand } from './types';

export type ProvisionServiceOptions = {
  write: MoodleWritePort;
  identity: IdentityLinkPort;
  audit: ProvisionAuditPort;
  metrics?: ProvisionMetricsPort | null;
  queue?: ProvisionQueue | null;
  /** Sempre true neste épico — execute real bloqueado. */
  forceDryRun?: boolean;
};

/**
 * Orquestra create/update/disable/enable/sync de usuários Moodle.
 * Runtime força dry-run (EXECUTE_DISABLED_UNTIL_ACTIVATION).
 */
export class ProvisionService {
  private readonly write: MoodleWritePort;
  private readonly identity: IdentitySync;
  private readonly audit: ProvisionAuditPort;
  private readonly metrics: ProvisionMetricsPort | null;
  private readonly queue: ProvisionQueue | null;
  private readonly forceDryRun: boolean;

  constructor(options: ProvisionServiceOptions) {
    this.write = options.write;
    this.identity = new IdentitySync(options.identity);
    this.audit = options.audit;
    this.metrics = options.metrics ?? null;
    this.queue = options.queue ?? null;
    this.forceDryRun = options.forceDryRun !== false;
  }

  async handleUser(command: ProvisionUserCommand): Promise<ProvisionResult> {
    const started = Date.now();
    assertProvisionRole(command.actor);
    const idempotencyKey = requireIdempotencyKey(command.idempotencyKey);
    const correlationId = requireCorrelationId(command.correlationId);

    if (this.queue) {
      const { job, deduplicated } = await this.queue.register({
        type: 'user',
        action: command.action,
        payload: { ...command, idempotencyKey, correlationId },
        correlationId,
        idempotencyKey,
      });
      this.metrics?.setQueueSize(await this.queue.size());
      if (deduplicated) {
        await this.audit.record({
          action: `provision.user.${command.action}`,
          actorId: command.actor.omniaUserId,
          targetUserId: command.omniaUserId,
          correlationId,
          origin: command.actor.origin,
          result: 'deduplicated',
          latencyMs: Date.now() - started,
          attempts: job.attempts,
          metadata: { jobId: job.id, idempotencyKey },
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
        const result = await this.executeUser({
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
          action: `provision.user.${command.action}`,
          actorId: command.actor.omniaUserId,
          targetUserId: command.omniaUserId,
          correlationId,
          origin: command.actor.origin,
          result: final.ok ? (this.forceDryRun ? 'dry-run' : 'success') : 'failure',
          latencyMs,
          attempts: final.attempts,
          newValue: final.simulated,
          reason: final.message ?? null,
          metadata: { mode: final.mode, code: final.code, jobId: job.id },
        });

        if (final.ok) this.metrics?.incProvisionSuccess(command.action);
        else this.metrics?.incProvisionFailure(command.action);
        this.metrics?.observeLatency(`user.${command.action}`, latencyMs / 1000);

        return final;
      } catch (err) {
        const latencyMs = Date.now() - started;
        const message = err instanceof Error ? err.message : String(err);
        this.metrics?.incProvisionFailure(command.action);
        this.metrics?.incRetry();
        await this.queue.fail(job.id, message);
        await this.audit.record({
          action: `provision.user.${command.action}`,
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
          code: (err as { code?: string })?.code ?? 'PROVISION_ERROR',
          message,
          latencyMs,
          attempts: 1,
        };
      }
    }

    try {
      const result = await this.executeUser({
        ...command,
        idempotencyKey,
        correlationId,
      });
      const latencyMs = Date.now() - started;
      const final: ProvisionResult = { ...result, latencyMs, attempts: result.attempts || 1 };

      await this.audit.record({
        action: `provision.user.${command.action}`,
        actorId: command.actor.omniaUserId,
        targetUserId: command.omniaUserId,
        correlationId,
        origin: command.actor.origin,
        result: final.ok ? (this.forceDryRun ? 'dry-run' : 'success') : 'failure',
        latencyMs,
        attempts: final.attempts,
        newValue: final.simulated,
        reason: final.message ?? null,
        metadata: { mode: final.mode, code: final.code },
      });

      if (final.ok) this.metrics?.incProvisionSuccess(command.action);
      else this.metrics?.incProvisionFailure(command.action);
      this.metrics?.observeLatency(`user.${command.action}`, latencyMs / 1000);

      return final;
    } catch (err) {
      const latencyMs = Date.now() - started;
      const message = err instanceof Error ? err.message : String(err);
      this.metrics?.incProvisionFailure(command.action);
      await this.audit.record({
        action: `provision.user.${command.action}`,
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
        code: (err as { code?: string })?.code ?? 'PROVISION_ERROR',
        message,
        latencyMs,
        attempts: 1,
      };
    }
  }

  private async executeUser(command: ProvisionUserCommand): Promise<ProvisionResult> {
    // EXECUTE_DISABLED_UNTIL_ACTIVATION — sempre dry-run neste épico
    void this.forceDryRun;

    if (command.action === 'create' || command.action === 'sync') {
      const skip = await this.identity.shouldSkipCreate(command.omniaUserId);
      if (skip.skip) {
        return {
          ok: true,
          mode: 'dry-run',
          action: command.action,
          idempotencyKey: command.idempotencyKey,
          correlationId: command.correlationId,
          deduplicated: true,
          latencyMs: 0,
          attempts: 1,
          code: 'IDENTITY_ALREADY_LINKED',
          message: skip.reason,
          simulated: {
            moodleUserId: skip.moodleUserId,
            note: 'no-op: identity link already active (dry-run)',
          },
        };
      }

      const username = command.username || `omnia_${command.omniaUserId}`;
      const email = command.email || `${username}@example.invalid`;
      return this.write.createUser({
        username,
        email,
        firstName: command.firstName || 'Omnia',
        lastName: command.lastName || 'User',
        correlationId: command.correlationId,
      });
    }

    const moodleUserId = command.moodleUserId;
    if (moodleUserId == null) {
      const existing = await this.identity.resolveExisting(command.omniaUserId);
      if (existing.moodleUserId == null) {
        return {
          ok: false,
          mode: 'dry-run',
          action: command.action,
          idempotencyKey: command.idempotencyKey,
          correlationId: command.correlationId,
          code: 'MOODLE_USER_REQUIRED',
          message: 'moodleUserId or active identity link required',
          latencyMs: 0,
          attempts: 1,
        };
      }
      return this.applyUserMutation(command, existing.moodleUserId);
    }

    return this.applyUserMutation(command, moodleUserId);
  }

  private applyUserMutation(command: ProvisionUserCommand, moodleUserId: number) {
    if (command.action === 'disable') {
      return this.write.updateUser({
        moodleUserId,
        suspended: true,
        correlationId: command.correlationId,
      });
    }
    if (command.action === 'enable') {
      return this.write.updateUser({
        moodleUserId,
        suspended: false,
        correlationId: command.correlationId,
      });
    }
    return this.write.updateUser({
      moodleUserId,
      email: command.email,
      firstName: command.firstName,
      lastName: command.lastName,
      correlationId: command.correlationId,
    });
  }
}
