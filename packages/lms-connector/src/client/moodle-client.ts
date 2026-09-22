import { randomUUID } from 'node:crypto';

import { formatTraceparent, getTraceContext, withSpan } from '@omnia/monitoring/tracing';

import type { LmsConnectorConfig } from '../config/load-lms-config';
import { redactToken } from '../config/load-lms-config';
import {
  mapMoodleException,
  MoodleTimeoutError,
  MoodleUnavailableError,
  MoodleUnexpectedResponseError,
  MoodleValidationError,
  LmsConnectorError,
} from '../errors';
import { lmsLog } from '../observability/log';
import { recordMoodleCall } from '../observability/metrics';
import {
  IDEMPOTENT_MOODLE_FUNCTIONS,
  MOODLE_READ_FUNCTION_SET,
  MOODLE_WRITE_CAPABILITY_CATALOG,
  MOODLE_WRITE_FUNCTION_SET,
  type MoodleReadFunction,
  type MoodleWriteCapability,
  type MoodleWriteFunction,
} from './moodle-functions';

export type MoodleClientOptions = {
  config: LmsConnectorConfig;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
};

export type MoodleCallOptions = {
  signal?: AbortSignal;
  correlationId?: string;
  skipRetry?: boolean;
};

export type MoodleWriteCallOptions = MoodleCallOptions & {
  /**
   * Default: true (dry-run). Sprint 3.0 força dry-run enquanto
   * provisionExecuteEnabled=false (EXECUTE_DISABLED_UNTIL_ACTIVATION).
   */
  dryRun?: boolean;
};

export type MoodleWriteResult<T = unknown> = {
  mode: 'dry-run' | 'execute';
  functionName: string;
  correlationId: string;
  params: Record<string, unknown>;
  data: T;
  code?: string;
};

type MoodleExceptionBody = {
  exception?: string;
  errorcode?: string;
  message?: string;
};

function isMoodleException(value: unknown): value is MoodleExceptionBody {
  return (
    !!value &&
    typeof value === 'object' &&
    ('exception' in value || 'errorcode' in value) &&
    !('sitename' in value) &&
    !('courses' in value) &&
    !('users' in value)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cliente centralizado Moodle REST.
 * Nunca espalhar fetch direto ao Moodle fora desta classe.
 */
export class MoodleClient {
  private readonly config: LmsConnectorConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;
  private failures = 0;
  private circuitOpenUntil = 0;

  constructor(options: MoodleClientOptions) {
    this.config = options.config;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxRetries = options.maxRetries ?? 2;
  }

  get baseUrl(): string {
    return this.config.moodleInternalUrl || this.config.moodleBaseUrl;
  }

  get isEnabled(): boolean {
    return this.config.connectorEnabled;
  }

  get isReadOnly(): boolean {
    return this.config.connectorReadOnly;
  }

  get provisionDryRunForced(): boolean {
    // Epic lock: execute real bloqueado até ativação explícita
    return !this.config.provisionExecuteEnabled || this.config.provisionDryRun !== false;
  }

  assertEnabled(): void {
    if (!this.config.connectorEnabled) {
      throw new LmsConnectorError('CONNECTOR_DISABLED', 'LMS connector is disabled', {
        httpStatus: 503,
      });
    }
  }

  /** Allowlist local de writes (+ notas). Não executa HTTP write. */
  listWriteCapabilities(): MoodleWriteCapability[] {
    return MOODLE_WRITE_CAPABILITY_CATALOG.map((c) => ({
      ...c,
      note: this.provisionDryRunForced
        ? `${c.note ?? ''} | EXECUTE_DISABLED_UNTIL_ACTIVATION`.trim()
        : c.note,
    }));
  }

  async call<T = unknown>(
    wsfunction: MoodleReadFunction | string,
    params: Record<string, unknown> = {},
    options: MoodleCallOptions = {},
  ): Promise<T> {
    return withSpan(
      `moodle.${wsfunction}`,
      async () => this.callInner(wsfunction, params, options),
      { component: 'moodle-client' },
    );
  }

  /**
   * Caminho WRITE: allowlist + dry-run forçado neste épico.
   * Nunca usa o path `call()` (read). Sem HTTP quando dry-run.
   */
  async callWrite<T = unknown>(
    wsfunction: MoodleWriteFunction | string,
    params: Record<string, unknown> = {},
    options: MoodleWriteCallOptions = {},
  ): Promise<MoodleWriteResult<T>> {
    return withSpan(
      `moodle.write.${wsfunction}`,
      async () => this.callWriteInner<T>(wsfunction, params, options),
      { component: 'moodle-client-write' },
    );
  }

  private async callWriteInner<T>(
    wsfunction: string,
    params: Record<string, unknown>,
    options: MoodleWriteCallOptions,
  ): Promise<MoodleWriteResult<T>> {
    this.assertEnabled();

    if (!MOODLE_WRITE_FUNCTION_SET.has(wsfunction)) {
      throw new MoodleValidationError(
        'Moodle write function is not allowed by connector write policy',
      );
    }

    const trace = getTraceContext();
    const correlationId = options.correlationId || trace?.requestId || randomUUID();
    const wantDryRun = options.dryRun !== false;
    const forcedDryRun = this.provisionDryRunForced || wantDryRun;

    if (forcedDryRun) {
      lmsLog('info', 'moodle.write.dry_run', {
        correlationId,
        function: wsfunction,
        result: 'dry-run',
        code: 'EXECUTE_DISABLED_UNTIL_ACTIVATION',
      });
      return {
        mode: 'dry-run',
        functionName: wsfunction,
        correlationId,
        params,
        code: 'EXECUTE_DISABLED_UNTIL_ACTIVATION',
        data: {
          simulated: true,
          function: wsfunction,
          params,
        } as T,
      };
    }

    // Caminho execute (bloqueado neste épico; permanece para contrato futuro)
    const data = await this.executeOnce<T>(wsfunction, params, {
      ...options,
      correlationId,
    });
    return {
      mode: 'execute',
      functionName: wsfunction,
      correlationId,
      params,
      data,
    };
  }

  private async callInner<T = unknown>(
    wsfunction: MoodleReadFunction | string,
    params: Record<string, unknown> = {},
    options: MoodleCallOptions = {},
  ): Promise<T> {
    this.assertEnabled();

    if (!MOODLE_READ_FUNCTION_SET.has(wsfunction)) {
      throw new MoodleValidationError('Moodle function is not allowed by connector policy');
    }

    const now = Date.now();
    if (now < this.circuitOpenUntil) {
      throw new MoodleUnavailableError('Moodle circuit breaker is open');
    }

    const trace = getTraceContext();
    const correlationId = options.correlationId || trace?.requestId || randomUUID();
    const idempotent = IDEMPOTENT_MOODLE_FUNCTIONS.has(wsfunction);
    const attempts = options.skipRetry || !idempotent ? 1 : Math.max(1, this.maxRetries + 1);

    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const started = Date.now();
      try {
        const result = await this.executeOnce<T>(wsfunction, params, {
          ...options,
          correlationId,
        });
        this.failures = 0;
        recordMoodleCall({
          functionName: wsfunction,
          durationMs: Date.now() - started,
          ok: true,
        });
        lmsLog('info', 'moodle.request', {
          correlationId,
          function: wsfunction,
          durationMs: Date.now() - started,
          result: 'ok',
          attempt,
        });
        return result;
      } catch (err) {
        lastError = err;
        const retryable = err instanceof LmsConnectorError ? err.retryable : false;
        recordMoodleCall({
          functionName: wsfunction,
          durationMs: Date.now() - started,
          ok: false,
          code: err instanceof LmsConnectorError ? err.code : 'UNKNOWN',
        });
        lmsLog('warn', 'moodle.request', {
          correlationId,
          function: wsfunction,
          durationMs: Date.now() - started,
          result: 'error',
          code: err instanceof LmsConnectorError ? err.code : 'UNKNOWN',
          attempt,
        });

        if (!retryable || attempt >= attempts) {
          this.failures += 1;
          if (this.failures >= 5) {
            this.circuitOpenUntil = Date.now() + 30_000;
            this.failures = 0;
          }
          throw err;
        }
        await sleep(100 * attempt);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new MoodleUnavailableError('Moodle request failed');
  }

  private async executeOnce<T>(
    wsfunction: string,
    params: Record<string, unknown>,
    options: MoodleCallOptions & { correlationId: string },
  ): Promise<T> {
    const url = `${this.baseUrl}/webservice/rest/server.php`;
    const body = new URLSearchParams();
    body.set('wstoken', this.config.moodleRestToken);
    body.set('wsfunction', wsfunction);
    body.set('moodlewsrestformat', 'json');
    appendFormParams(body, params);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.moodleRequestTimeoutMs);

    const onAbort = () => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      const trace = getTraceContext();
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'X-Request-Id': options.correlationId,
      };
      if (trace) {
        headers.traceparent = formatTraceparent(trace);
      }

      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers,
        body: body.toString(),
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new MoodleUnavailableError(`Moodle HTTP ${response.status}`, {
          correlationId: options.correlationId,
        });
      }

      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        throw new MoodleUnexpectedResponseError('Moodle returned invalid JSON', {
          correlationId: options.correlationId,
        });
      }

      if (isMoodleException(parsed)) {
        throw mapMoodleException(parsed, options.correlationId);
      }

      return parsed as T;
    } catch (err) {
      if (err instanceof LmsConnectorError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new MoodleTimeoutError('Moodle request timed out', {
          correlationId: options.correlationId,
        });
      }
      const sanitized = String(err instanceof Error ? err.message : err).replace(
        this.config.moodleRestToken,
        redactToken(this.config.moodleRestToken),
      );
      throw new MoodleUnavailableError(`Moodle network error: ${sanitized}`, {
        correlationId: options.correlationId,
        cause: err,
      });
    } finally {
      clearTimeout(timeout);
      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
    }
  }
}

export function appendFormParams(
  body: URLSearchParams,
  params: Record<string, unknown>,
  prefix = '',
): void {
  for (const [key, value] of Object.entries(params)) {
    const path = prefix ? `${prefix}[${key}]` : key;
    if (value == null) continue;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item != null && typeof item === 'object' && !Array.isArray(item)) {
          appendFormParams(body, item as Record<string, unknown>, `${path}[${index}]`);
        } else if (item != null) {
          body.append(`${path}[${index}]`, String(item));
        }
      });
    } else if (typeof value === 'object') {
      appendFormParams(body, value as Record<string, unknown>, path);
    } else if (typeof value === 'boolean') {
      body.append(path, value ? '1' : '0');
    } else {
      body.append(path, String(value));
    }
  }
}
