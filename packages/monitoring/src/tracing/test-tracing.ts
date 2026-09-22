import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createTraceContext,
  formatTraceparent,
  getTraceContext,
  parseTraceparent,
  runWithTraceContextAsync,
  withSpan,
} from '../index.js';

describe('tracing context', () => {
  it('creates valid hex ids', () => {
    const ctx = createTraceContext();
    assert.match(ctx.traceId, /^[a-f0-9]{32}$/);
    assert.match(ctx.spanId, /^[a-f0-9]{16}$/);
    assert.equal(ctx.parentSpanId, null);
  });

  it('parses and formats W3C traceparent', () => {
    const ctx = createTraceContext({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      parentSpanId: null,
    });
    const header = formatTraceparent(ctx);
    assert.match(header, /^00-4bf92f3577b34da6a3ce929d0e0e4736-[a-f0-9]{16}-01$/);
    const parsed = parseTraceparent(header);
    assert.ok(parsed);
    assert.equal(parsed.traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('propagates parent→child spans', async () => {
    const root = createTraceContext();
    await runWithTraceContextAsync(root, async () => {
      await withSpan('child', async (span) => {
        assert.equal(span.traceId, root.traceId);
        assert.equal(span.parentSpanId, root.spanId);
        assert.equal(getTraceContext()?.spanId, span.spanId);
        return true;
      });
    });
  });
});
