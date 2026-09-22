/**
 * Exportador OTLP HTTP (JSON) opcional — OpenTelemetry-compatible.
 * Ativado quando OTEL_EXPORTER_OTLP_ENDPOINT estiver definido.
 * Não altera regras de negócio.
 */

import type { TraceContext } from './context';

export type OtlpSpan = {
  name: string;
  ctx: TraceContext;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  status: 'ok' | 'error';
  attributes?: Record<string, string | number | boolean>;
};

function toNano(ms: number): string {
  return `${BigInt(ms) * 1_000_000n}`;
}

export async function exportOtlpSpan(span: OtlpSpan): Promise<void> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!endpoint) return;

  const url = endpoint.replace(/\/$/, '') + '/v1/traces';
  const serviceName = process.env.OTEL_SERVICE_NAME || 'omnia-admin';
  const body = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: serviceName } },
            {
              key: 'deployment.environment',
              value: {
                stringValue:
                  process.env.APP_ENV || process.env.OMNIA_ENV || process.env.NODE_ENV || 'dev',
              },
            },
          ],
        },
        scopeSpans: [
          {
            scope: { name: '@omnia/monitoring', version: '0.1.0' },
            spans: [
              {
                traceId: span.ctx.traceId,
                spanId: span.ctx.spanId,
                parentSpanId: span.ctx.parentSpanId || undefined,
                name: span.name,
                kind: 1,
                startTimeUnixNano: span.startTimeUnixNano,
                endTimeUnixNano: span.endTimeUnixNano,
                status: { code: span.status === 'ok' ? 1 : 2 },
                attributes: Object.entries(span.attributes || {}).map(([key, value]) => ({
                  key,
                  value:
                    typeof value === 'string'
                      ? { stringValue: value }
                      : typeof value === 'boolean'
                        ? { boolValue: value }
                        : { doubleValue: Number(value) },
                })),
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Never fail the request path because of telemetry export.
  }
}

export function nowUnixNano(): string {
  return toNano(Date.now());
}
