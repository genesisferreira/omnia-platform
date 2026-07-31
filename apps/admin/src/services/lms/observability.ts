/**
 * Instrumentação HTTP do BFF LMS — metrics + tracing + logs.
 * Não altera regras de negócio.
 */

import { createLogger } from '@omnia/logger';
import {
  httpErrorsTotal,
  httpRequestDurationSeconds,
  httpRequestsTotal,
  lmsApiErrors,
  lmsCompletionRequests,
  lmsCoursesOpened,
  lmsGradeRequests,
  lmsLessonsCompleted,
  lmsLessonsStarted,
  lmsProgressRequests,
} from '@omnia/monitoring/metrics';
import {
  createTraceContext,
  formatTraceparent,
  parseTraceparent,
  runWithTraceContextAsync,
  type TraceContext,
} from '@omnia/monitoring/tracing';
import type { PayloadRequest } from 'payload';

const log = createLogger({ service: 'omnia-admin-lms' });

function routeLabel(route: string): string {
  return route.replace(/[^a-zA-Z0-9_./:-]/g, '_').slice(0, 120);
}

function resolveTrace(req: PayloadRequest): TraceContext {
  const parent = parseTraceparent(req.headers.get('traceparent'));
  const requestId =
    req.headers.get('x-request-id') ||
    req.headers.get('x-correlation-id') ||
    undefined;
  return createTraceContext({
    traceId: parent?.traceId,
    parentSpanId: parent?.parentSpanId ?? null,
    requestId,
  });
}

export async function withLmsObservability(
  req: PayloadRequest,
  route: string,
  handler: () => Promise<Response>,
  method = 'GET',
): Promise<Response> {
  const ctx = resolveTrace(req);
  const started = Date.now();
  const label = routeLabel(route);

  return runWithTraceContextAsync(ctx, async () => {
    let status = 500;
    try {
      const response = await handler();
      status = response.status;
      const headers = new Headers(response.headers);
      headers.set('traceparent', formatTraceparent(ctx));
      headers.set('x-request-id', ctx.requestId);
      headers.set('x-trace-id', ctx.traceId);
      const out = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      return out;
    } catch (err) {
      status = 500;
      throw err;
    } finally {
      const latencySec = (Date.now() - started) / 1000;
      const statusClass = `${Math.floor(status / 100)}xx`;
      httpRequestsTotal.inc({ route: label, method, status: statusClass });
      httpRequestDurationSeconds.observe({ route: label }, latencySec);
      if (status >= 400) {
        httpErrorsTotal.inc({ route: label, status: String(status) });
        lmsApiErrors.inc({ route: label, status_class: statusClass });
      }
      log.info('lms.http', {
        route: label,
        method,
        status,
        latency: Math.round(latencySec * 1000),
        requestId: ctx.requestId,
        traceId: ctx.traceId,
        spanId: ctx.spanId,
      });
    }
  });
}

/** Métricas de negócio por rota (sem PII). */
export function recordBusinessRoute(route: string, payload?: { completed?: boolean }): void {
  switch (route) {
    case 'courses_by_id':
      lmsCoursesOpened.inc();
      break;
    case 'course_content':
      lmsLessonsStarted.inc();
      break;
    case 'progress':
      lmsProgressRequests.inc();
      break;
    case 'grades':
      lmsGradeRequests.inc();
      break;
    case 'completion':
      lmsCompletionRequests.inc();
      if (payload?.completed) lmsLessonsCompleted.inc();
      break;
    default:
      break;
  }
}
