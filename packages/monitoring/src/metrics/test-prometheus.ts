import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import {
  Counter,
  Histogram,
  Registry,
  renderPrometheusMetrics,
  resetPrometheusMetricsForTests,
  httpRequestsTotal,
  moodleRequestsTotal,
} from '../index.js';

describe('prometheus registry', () => {
  beforeEach(() => {
    resetPrometheusMetricsForTests();
  });

  it('renders HELP/TYPE and counter samples', () => {
    httpRequestsTotal.inc({ route: '/omnia/lms/health', method: 'GET', status: '2xx' });
    const text = renderPrometheusMetrics();
    assert.match(text, /# HELP http_requests_total/);
    assert.match(text, /# TYPE http_requests_total counter/);
    assert.match(text, /http_requests_total\{.*route="\/omnia\/lms\/health".*\} 1/);
  });

  it('histogram includes buckets', () => {
    const reg = new Registry();
    const h = reg.register(new Histogram('demo_latency_seconds', 'demo', [0.1, 0.5]));
    h.observe({}, 0.2);
    const text = reg.render();
    assert.match(text, /demo_latency_seconds_bucket\{le="0.1"\} 0/);
    assert.match(text, /demo_latency_seconds_bucket\{le="0.5"\} 1/);
    assert.match(text, /demo_latency_seconds_count 1/);
  });

  it('does not embed secret-like label keys by convention (manual sample)', () => {
    moodleRequestsTotal.inc({ function: 'core_webservice_get_site_info' });
    const text = renderPrometheusMetrics();
    assert.doesNotMatch(text, /wstoken|password|authorization/i);
  });
});

describe('counter isolation', () => {
  it('supports labeled series', () => {
    const c = new Counter('test_total', 'test');
    c.inc({ a: '1' }, 2);
    c.inc({ a: '2' }, 3);
    assert.equal(c.get({ a: '1' }), 2);
    assert.equal(c.get({ a: '2' }), 3);
  });
});
