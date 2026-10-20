import { renderPrometheusMetrics } from '@omnia/monitoring/metrics';
import { NextResponse } from 'next/server';

function requiresMetricsAuth(): boolean {
  const env = (
    process.env.APP_ENV ||
    process.env.OMNIA_ENV ||
    process.env.NODE_ENV ||
    ''
  ).toLowerCase();
  // Em staging/prod o scrape token é obrigatório (fail-closed).
  if (env === 'staging' || env === 'production' || env === 'prod') return true;
  // Em qualquer ambiente, se o token existir, exige autenticação.
  return Boolean(process.env.METRICS_SCRAPE_TOKEN?.trim());
}

/**
 * Prometheus scrape endpoint.
 * Staging/prod: exige METRICS_SCRAPE_TOKEN (Bearer ou X-Metrics-Token).
 * Nunca inclui tokens, cookies ou PII nos labels.
 */
export async function GET(request: Request) {
  const expected = process.env.METRICS_SCRAPE_TOKEN?.trim();
  if (requiresMetricsAuth()) {
    if (!expected) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'METRICS_MISCONFIGURED',
            message: 'METRICS_SCRAPE_TOKEN is required in this environment',
          },
        },
        { status: 503 },
      );
    }
    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const alt = request.headers.get('x-metrics-token')?.trim() || '';
    if (token !== expected && alt !== expected) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Metrics scrape unauthorized' } },
        { status: 401 },
      );
    }
  }

  const body = renderPrometheusMetrics();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
