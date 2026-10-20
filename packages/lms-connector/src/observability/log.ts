/**
 * Logging estruturado do LMS connector — sanitizado + correlation/trace.
 */

import { createLogger } from '@omnia/logger';
import { getTraceContext } from '@omnia/monitoring/tracing';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const base = createLogger({ service: 'lms-connector' });

/** Log estruturado sanitizado do LMS connector. */
export function lmsLog(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
  const trace = getTraceContext();
  const enriched = {
    ...fields,
    ...(trace
      ? {
          requestId: fields.requestId ?? trace.requestId,
          traceId: fields.traceId ?? trace.traceId,
          spanId: fields.spanId ?? trace.spanId,
          parentSpanId: fields.parentSpanId ?? trace.parentSpanId,
        }
      : {}),
  };
  base[level](event, enriched);
}
