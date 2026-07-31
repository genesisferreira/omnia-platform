import { renderPrometheusMetrics } from '@omnia/monitoring/metrics';
import { NextResponse } from 'next/server';

/**
 * Prometheus scrape endpoint.
 * Protegido por METRICS_SCRAPE_TOKEN (Bearer) quando definido.
 * Nunca inclui tokens, cookies ou PII nos labels.
 */
export async function GET(request: Request) {
  const expected = process.env.METRICS_SCRAPE_TOKEN?.trim();
  if (expected) {
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
