import {
  createDryRunMoodleWritePort,
  createMemoryQueueStore,
  EnrollmentService,
  ProvisionQueue,
  ProvisionService,
  type EnrollmentCommand,
  type IdentityLinkPort,
  type MoodleWritePort,
  type ProvisionAuditPort,
  type ProvisionMetricsPort,
  type ProvisionQueueStore,
  type ProvisionResult,
  type ProvisionUserCommand,
  type WriteCapability,
} from '@omnia/academic-provisioning';
import { MoodleClient, MOODLE_WRITE_FUNCTIONS, type RedisLike } from '@omnia/lms-connector';
import {
  provisionFailureTotal,
  provisionLatencySeconds,
  provisionQueueSize,
  provisionRetryTotal,
  provisionSuccessTotal,
  enrollmentFailureTotal,
  enrollmentSuccessTotal,
} from '@omnia/monitoring/metrics';
import type { PayloadRequest } from 'payload';

import { findIdentityLink, writeLmsAudit } from './identity';
import { getMoodleClient, getRuntimeLmsConfig } from './runtime';

function createRedisQueueStore(redis: RedisLike): ProvisionQueueStore {
  return {
    async get(key) {
      return redis.get(key);
    },
    async set(key, value, ttlSeconds) {
      if (ttlSeconds != null && ttlSeconds > 0) {
        await redis.set(key, value, 'EX', ttlSeconds);
      } else {
        await redis.set(key, value);
      }
    },
    async del(key) {
      await redis.del(key);
    },
    async lpush(key, value) {
      if (!redis.lpush) throw new Error('REDIS_LPUSH_UNAVAILABLE');
      return redis.lpush(key, value);
    },
    async rpop(key) {
      if (!redis.rpop) throw new Error('REDIS_RPOP_UNAVAILABLE');
      return redis.rpop(key);
    },
    async llen(key) {
      if (!redis.llen) throw new Error('REDIS_LLEN_UNAVAILABLE');
      return redis.llen(key);
    },
  };
}

function createMoodleWriteAdapter(client: MoodleClient): MoodleWritePort {
  const toResult = (
    action: string,
    write: Awaited<ReturnType<MoodleClient['callWrite']>>,
  ): ProvisionResult => ({
    ok: true,
    mode: write.mode,
    action,
    idempotencyKey: '',
    correlationId: write.correlationId,
    latencyMs: 0,
    attempts: 1,
    code: write.code,
    simulated: (write.data as { simulated?: boolean; params?: unknown }) ?? {
      data: write.data,
    },
  });

  return {
    listWriteCapabilities(): WriteCapability[] {
      return client.listWriteCapabilities();
    },
    async createUser(input) {
      const write = await client.callWrite(
        MOODLE_WRITE_FUNCTIONS.createUsers,
        {
          users: [
            {
              username: input.username,
              email: input.email,
              firstname: input.firstName,
              lastname: input.lastName,
              auth: 'manual',
            },
          ],
        },
        { correlationId: input.correlationId, dryRun: true },
      );
      return toResult('create', write);
    },
    async updateUser(input) {
      const user: Record<string, unknown> = { id: input.moodleUserId };
      if (input.email != null) user.email = input.email;
      if (input.firstName != null) user.firstname = input.firstName;
      if (input.lastName != null) user.lastname = input.lastName;
      if (input.suspended != null) user.suspended = input.suspended ? 1 : 0;
      const write = await client.callWrite(
        MOODLE_WRITE_FUNCTIONS.updateUsers,
        { users: [user] },
        { correlationId: input.correlationId, dryRun: true },
      );
      return toResult('update', write);
    },
    async enrollUser(input) {
      const write = await client.callWrite(
        MOODLE_WRITE_FUNCTIONS.enrolUsers,
        {
          enrolments: [
            {
              roleid: input.roleId ?? 5,
              userid: input.moodleUserId,
              courseid: input.moodleCourseId,
            },
          ],
        },
        { correlationId: input.correlationId, dryRun: true },
      );
      return toResult('enroll', write);
    },
    async unenrollUser(input) {
      const write = await client.callWrite(
        MOODLE_WRITE_FUNCTIONS.unenrolUsers,
        {
          enrolments: [
            {
              userid: input.moodleUserId,
              courseid: input.moodleCourseId,
            },
          ],
        },
        { correlationId: input.correlationId, dryRun: true },
      );
      return toResult('unenroll', write);
    },
  };
}

function createAuditPort(req: PayloadRequest): ProvisionAuditPort {
  return {
    async record(input) {
      await writeLmsAudit(req, {
        action: input.action,
        actorId: input.actorId,
        targetUserId: input.targetUserId,
        previousValue: input.previousValue,
        newValue: input.newValue,
        reason: input.reason,
        metadata: {
          ...(input.metadata ?? {}),
          correlationId: input.correlationId,
          origin: input.origin,
          result: input.result,
          latencyMs: input.latencyMs,
          attempts: input.attempts,
        },
      });
    },
  };
}

function createMetricsPort(): ProvisionMetricsPort {
  return {
    incProvisionSuccess(action) {
      provisionSuccessTotal.inc({ action });
    },
    incProvisionFailure(action) {
      provisionFailureTotal.inc({ action });
    },
    incEnrollmentSuccess(action) {
      enrollmentSuccessTotal.inc({ action });
    },
    incEnrollmentFailure(action) {
      enrollmentFailureTotal.inc({ action });
    },
    incRetry() {
      provisionRetryTotal.inc();
    },
    setQueueSize(size) {
      provisionQueueSize.set({}, size);
    },
    observeLatency(action, seconds) {
      provisionLatencySeconds.observe({ action }, seconds);
    },
  };
}

function createIdentityPort(req: PayloadRequest): IdentityLinkPort {
  return {
    async findActive(omniaUserId) {
      const link = await findIdentityLink(req.payload, omniaUserId);
      if (!link) return { exists: false };
      return {
        exists: true,
        moodleUserId: link.moodleUserId,
        status: link.status,
      };
    },
  };
}

let cachedQueue: ProvisionQueue | null = null;

async function getProvisionQueue(): Promise<ProvisionQueue> {
  if (cachedQueue) return cachedQueue;
  const config = getRuntimeLmsConfig();
  const ns = `omnia:lms:provision:${config.appEnv}`;
  let store: ProvisionQueueStore = createMemoryQueueStore();

  if (config.redisUrl) {
    try {
      const { createRedisFromUrl } = await import('@omnia/lms-connector');
      const redis = await createRedisFromUrl(config.redisUrl);
      if (redis.lpush && redis.rpop && redis.llen) {
        store = createRedisQueueStore(redis);
      }
    } catch {
      store = createMemoryQueueStore();
    }
  } else if (config.appEnv !== 'development' && config.appEnv !== 'test') {
    // production-like sem Redis: memory ainda permite homologação local
    store = createMemoryQueueStore();
  }

  cachedQueue = new ProvisionQueue({ store, namespace: ns });
  return cachedQueue;
}

export type ProvisionRuntime = {
  provision: ProvisionService;
  enrollment: EnrollmentService;
  queue: ProvisionQueue;
  write: MoodleWritePort;
  metrics: ProvisionMetricsPort;
};

export async function getProvisionRuntime(req: PayloadRequest): Promise<ProvisionRuntime> {
  const config = getRuntimeLmsConfig();
  if (!config.provisionEnabled) {
    const err = new Error('PROVISION_DISABLED');
    (err as Error & { status: number }).status = 503;
    throw err;
  }

  const client = await getMoodleClient();
  const write =
    config.connectorEnabled && client.isEnabled
      ? createMoodleWriteAdapter(client)
      : createDryRunMoodleWritePort();
  const queue = await getProvisionQueue();
  const audit = createAuditPort(req);
  const metrics = createMetricsPort();
  const identity = createIdentityPort(req);

  return {
    write,
    queue,
    metrics,
    provision: new ProvisionService({
      write,
      identity,
      audit,
      metrics,
      queue,
      forceDryRun: true,
    }),
    enrollment: new EnrollmentService({
      write,
      identity,
      audit,
      metrics,
      queue,
      forceDryRun: true,
    }),
  };
}

export async function handleProvisionUser(
  req: PayloadRequest,
  command: ProvisionUserCommand,
): Promise<ProvisionResult> {
  const runtime = await getProvisionRuntime(req);
  return runtime.provision.handleUser(command);
}

export async function handleProvisionEnrollment(
  req: PayloadRequest,
  command: EnrollmentCommand,
): Promise<ProvisionResult> {
  const runtime = await getProvisionRuntime(req);
  return runtime.enrollment.handleEnrollment(command);
}

export async function getProvisionJob(req: PayloadRequest, jobId: string) {
  const runtime = await getProvisionRuntime(req);
  return runtime.queue.getJob(jobId);
}

export async function listProvisionCapabilities(req: PayloadRequest) {
  const runtime = await getProvisionRuntime(req);
  const config = getRuntimeLmsConfig();
  return {
    mode: 'dry-run' as const,
    code: 'EXECUTE_DISABLED_UNTIL_ACTIVATION',
    provisionEnabled: config.provisionEnabled,
    provisionDryRun: true,
    provisionExecuteEnabled: false,
    capabilities: runtime.write.listWriteCapabilities(),
  };
}

/**
 * Processa até N jobs da fila (S2S tick — sem daemon).
 * Executa sem re-registrar idempotency (services sem queue).
 */
export async function tickProvisionWorker(
  req: PayloadRequest,
  maxJobs = 5,
): Promise<{ processed: number; results: ProvisionResult[] }> {
  const runtime = await getProvisionRuntime(req);
  const identity = createIdentityPort(req);
  const audit = createAuditPort(req);
  const executorProvision = new ProvisionService({
    write: runtime.write,
    identity,
    audit,
    metrics: runtime.metrics,
    queue: null,
    forceDryRun: true,
  });
  const executorEnrollment = new EnrollmentService({
    write: runtime.write,
    identity,
    audit,
    metrics: runtime.metrics,
    queue: null,
    forceDryRun: true,
  });

  const results: ProvisionResult[] = [];
  let processed = 0;

  for (let i = 0; i < maxJobs; i += 1) {
    const job = await runtime.queue.dequeueReady();
    if (!job) break;
    processed += 1;
    try {
      let result: ProvisionResult;
      if (job.type === 'user') {
        result = await executorProvision.handleUser(job.payload as unknown as ProvisionUserCommand);
      } else {
        result = await executorEnrollment.handleEnrollment(
          job.payload as unknown as EnrollmentCommand,
        );
      }
      await runtime.queue.complete(job.id, { ...result, jobId: job.id });
      results.push({ ...result, jobId: job.id });
    } catch (err) {
      runtime.metrics.incRetry();
      await runtime.queue.fail(job.id, err instanceof Error ? err.message : String(err));
      results.push({
        ok: false,
        mode: 'dry-run',
        action: job.action,
        idempotencyKey: job.idempotencyKey,
        correlationId: job.correlationId,
        jobId: job.id,
        message: err instanceof Error ? err.message : String(err),
        latencyMs: 0,
        attempts: job.attempts + 1,
      });
    }
  }

  runtime.metrics.setQueueSize(await runtime.queue.size());
  return { processed, results };
}

export function resetProvisionRuntimeForTests(): void {
  cachedQueue = null;
}
