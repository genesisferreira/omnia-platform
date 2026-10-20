import { createHash, randomUUID } from 'node:crypto';

import { RetryPolicy } from './retry';
import type { ProvisionJob, ProvisionJobStatus, ProvisionResult } from './types';

export type ProvisionQueueStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  lpush(key: string, value: string): Promise<number>;
  rpop(key: string): Promise<string | null>;
  llen(key: string): Promise<number>;
};

/** Store em memória para testes / DEV sem Redis. */
export function createMemoryQueueStore(): ProvisionQueueStore {
  const kv = new Map<string, string>();
  const lists = new Map<string, string[]>();
  return {
    async get(key) {
      return kv.get(key) ?? null;
    },
    async set(key, value) {
      kv.set(key, value);
    },
    async del(key) {
      kv.delete(key);
    },
    async lpush(key, value) {
      const list = lists.get(key) ?? [];
      list.unshift(value);
      lists.set(key, list);
      return list.length;
    },
    async rpop(key) {
      const list = lists.get(key) ?? [];
      const v = list.pop();
      lists.set(key, list);
      return v ?? null;
    },
    async llen(key) {
      return (lists.get(key) ?? []).length;
    },
  };
}

export type ProvisionQueueOptions = {
  store: ProvisionQueueStore;
  namespace?: string;
  retry?: RetryPolicy;
  now?: () => number;
};

/**
 * Fila de provisionamento com dedupe por idempotency key,
 * retry e dead-letter.
 */
export class ProvisionQueue {
  private readonly store: ProvisionQueueStore;
  private readonly ns: string;
  private readonly retry: RetryPolicy;
  private readonly now: () => number;

  constructor(options: ProvisionQueueOptions) {
    this.store = options.store;
    this.ns = options.namespace ?? 'omnia:lms:provision:dev';
    this.retry = options.retry ?? new RetryPolicy();
    this.now = options.now ?? (() => Date.now());
  }

  private jobKey(id: string) {
    return `${this.ns}:job:${id}`;
  }

  private idemKey(key: string) {
    const hash = createHash('sha256').update(key).digest('hex').slice(0, 32);
    return `${this.ns}:idem:${hash}`;
  }

  private queueKey() {
    return `${this.ns}:q`;
  }

  private dlqKey() {
    return `${this.ns}:dlq`;
  }

  async size(): Promise<number> {
    return this.store.llen(this.queueKey());
  }

  async getJob(id: string): Promise<ProvisionJob | null> {
    const raw = await this.store.get(this.jobKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as ProvisionJob;
  }

  async findByIdempotency(idempotencyKey: string): Promise<ProvisionJob | null> {
    const existingId = await this.store.get(this.idemKey(idempotencyKey));
    if (!existingId) return null;
    return this.getJob(existingId);
  }

  /**
   * Registra job + idempotency (sem colocar na lista pronta).
   * Usado no caminho síncrono dry-run do BFF.
   */
  async register(input: {
    type: 'user' | 'enrollment';
    action: string;
    payload: Record<string, unknown>;
    correlationId: string;
    idempotencyKey: string;
  }): Promise<{ job: ProvisionJob; deduplicated: boolean }> {
    const existing = await this.findByIdempotency(input.idempotencyKey);
    if (existing) {
      return { job: existing, deduplicated: true };
    }

    const id = randomUUID();
    const ts = this.now();
    const job: ProvisionJob = {
      id,
      type: input.type,
      action: input.action,
      payload: input.payload,
      status: 'queued',
      attempts: 0,
      maxAttempts: this.retry.maxAttempts,
      nextRunAt: ts,
      createdAt: ts,
      updatedAt: ts,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      lastError: null,
      result: null,
    };

    await this.store.set(this.jobKey(id), JSON.stringify(job));
    await this.store.set(this.idemKey(input.idempotencyKey), id, 86_400);
    return { job, deduplicated: false };
  }

  /** Coloca job na lista pronta para o worker tick. */
  async schedule(jobId: string): Promise<void> {
    await this.store.lpush(this.queueKey(), jobId);
  }

  /** register + schedule (caminho assíncrono). */
  async enqueue(input: {
    type: 'user' | 'enrollment';
    action: string;
    payload: Record<string, unknown>;
    correlationId: string;
    idempotencyKey: string;
  }): Promise<{ job: ProvisionJob; deduplicated: boolean }> {
    const registered = await this.register(input);
    if (!registered.deduplicated) {
      await this.schedule(registered.job.id);
    }
    return registered;
  }

  async dequeueReady(): Promise<ProvisionJob | null> {
    const id = await this.store.rpop(this.queueKey());
    if (!id) return null;
    const job = await this.getJob(id);
    if (!job) return null;
    if (job.nextRunAt > this.now()) {
      await this.store.lpush(this.queueKey(), id);
      return null;
    }
    job.status = 'processing';
    job.updatedAt = this.now();
    await this.store.set(this.jobKey(job.id), JSON.stringify(job));
    return job;
  }

  async complete(jobId: string, result: ProvisionResult): Promise<ProvisionJob | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;
    job.status = result.ok ? 'succeeded' : 'failed';
    job.result = result;
    job.updatedAt = this.now();
    await this.store.set(this.jobKey(job.id), JSON.stringify(job));
    return job;
  }

  async fail(jobId: string, errorMessage: string): Promise<ProvisionJob | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;
    job.attempts += 1;
    job.lastError = errorMessage;
    job.updatedAt = this.now();

    if (this.retry.isDeadLetter(job.attempts)) {
      job.status = 'dead_letter';
      await this.store.set(this.jobKey(job.id), JSON.stringify(job));
      await this.store.lpush(this.dlqKey(), job.id);
      return job;
    }

    job.status = 'queued';
    job.nextRunAt = this.now() + this.retry.nextDelayMs(job.attempts);
    await this.store.set(this.jobKey(job.id), JSON.stringify(job));
    await this.store.lpush(this.queueKey(), job.id);
    return job;
  }

  async markStatus(jobId: string, status: ProvisionJobStatus): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;
    job.status = status;
    job.updatedAt = this.now();
    await this.store.set(this.jobKey(job.id), JSON.stringify(job));
  }
}
