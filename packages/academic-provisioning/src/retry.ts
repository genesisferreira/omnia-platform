/** Backoff exponencial + dead-letter policy. */
export type RetryPolicyOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

export class RetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;

  constructor(options: RetryPolicyOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 5;
    this.baseDelayMs = options.baseDelayMs ?? 500;
    this.maxDelayMs = options.maxDelayMs ?? 60_000;
  }

  nextDelayMs(attempt: number): number {
    const exp = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** Math.max(0, attempt - 1));
    return exp;
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.maxAttempts;
  }

  isDeadLetter(attempt: number): boolean {
    return attempt >= this.maxAttempts;
  }
}
