import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomBytes } from 'node:crypto';

import { exportOtlpSpan, nowUnixNano } from './otlp';

export type TraceContext = {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  requestId: string;
};

const storage = new AsyncLocalStorage<TraceContext>();

function hexId(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

export function createTraceContext(seed?: {
  traceId?: string;
  parentSpanId?: string | null;
  requestId?: string;
}): TraceContext {
  return {
    traceId: seed?.traceId && /^[a-f0-9]{32}$/i.test(seed.traceId) ? seed.traceId : hexId(16),
    spanId: hexId(8),
    parentSpanId: seed?.parentSpanId ?? null,
    requestId: seed?.requestId || hexId(8),
  };
}

/** Parse W3C traceparent: version-traceid-spanid-flags */
export function parseTraceparent(header: string | null | undefined): {
  traceId: string;
  parentSpanId: string;
} | null {
  if (!header) return null;
  const parts = header.trim().split('-');
  if (parts.length < 4) return null;
  const [, traceId, parentSpanId] = parts;
  if (!traceId || !parentSpanId) return null;
  if (!/^[a-f0-9]{32}$/i.test(traceId) || !/^[a-f0-9]{16}$/i.test(parentSpanId)) return null;
  return { traceId: traceId.toLowerCase(), parentSpanId: parentSpanId.toLowerCase() };
}

export function formatTraceparent(ctx: TraceContext): string {
  return `00-${ctx.traceId}-${ctx.spanId}-01`;
}

export function getTraceContext(): TraceContext | undefined {
  return storage.getStore();
}

export function runWithTraceContext<T>(ctx: TraceContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export async function runWithTraceContextAsync<T>(
  ctx: TraceContext,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(ctx, fn);
}

export type SpanResult<T> = { result: T; spanId: string; durationMs: number };

/**
 * Cria um child span no contexto atual (ou raiz se inexistente).
 * Não altera regras de negócio — apenas correlação.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: TraceContext & { name: string }) => Promise<T>,
  attributes: Record<string, string | number | boolean> = {},
): Promise<T> {
  const parent = getTraceContext();
  const ctx = createTraceContext({
    traceId: parent?.traceId,
    parentSpanId: parent?.spanId ?? null,
    requestId: parent?.requestId,
  });
  const startedMs = Date.now();
  const startNano = nowUnixNano();
  return runWithTraceContextAsync(ctx, async () => {
    let status: 'ok' | 'error' = 'ok';
    try {
      const result = await fn({ ...ctx, name });
      emitSpanLog(name, ctx, Date.now() - startedMs, 'ok', attributes);
      return result;
    } catch (err) {
      status = 'error';
      emitSpanLog(name, ctx, Date.now() - startedMs, 'error', {
        ...attributes,
        errorName: err instanceof Error ? err.name : 'unknown',
      });
      throw err;
    } finally {
      void exportOtlpSpan({
        name,
        ctx,
        startTimeUnixNano: startNano,
        endTimeUnixNano: nowUnixNano(),
        status,
        attributes,
      });
    }
  });
}

function emitSpanLog(
  name: string,
  ctx: TraceContext,
  durationMs: number,
  result: 'ok' | 'error',
  attributes: Record<string, string | number | boolean>,
): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: result === 'error' ? 'warn' : 'debug',
    service: 'omnia-monitoring',
    event: 'span',
    name,
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    parentSpanId: ctx.parentSpanId,
    requestId: ctx.requestId,
    durationMs,
    result,
    attributes,
  });
  if (result === 'error') console.warn(line);
  else if (process.env.OTEL_LOG_SPANS === 'true') console.info(line);
}

/** Hash estável não-reversível para correlacionar user sem PII em métricas. */
export function hashSubject(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}
