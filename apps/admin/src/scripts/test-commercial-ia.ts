/**
 * Smoke marker — unit tests live in @omnia/neurofrigo-commercial.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('commercial-ia admin smoke', () => {
  it('exports commercial package', async () => {
    const mod = await import('@omnia/neurofrigo-commercial');
    assert.equal(typeof mod.CommercialService, 'function');
    assert.equal(typeof mod.buildSalesContext, 'function');
    assert.equal(typeof mod.buildProposalMarkdown, 'function');
  });
});
