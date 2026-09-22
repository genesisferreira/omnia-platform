import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateKnowledgeAcl,
  canTransition,
  canPublish,
  notImplementedPorts,
  SENSITIVE_TECHNICAL_DEFAULTS,
} from '@omnia/neurofrigo-knowledge';

describe('knowledge hub foundation (admin scripts)', () => {
  it('keeps sensitive technical defaults safe', () => {
    assert.equal(SENSITIVE_TECHNICAL_DEFAULTS.allowAiUse, false);
    assert.equal(SENSITIVE_TECHNICAL_DEFAULTS.status, 'draft');
    assert.equal(SENSITIVE_TECHNICAL_DEFAULTS.humanReviewRequired, true);
  });

  it('embedding port is not implemented', async () => {
    const r = await notImplementedPorts.embeddingProvider.embed({ texts: ['x'] });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'NOT_IMPLEMENTED');
  });

  it('web research port is not implemented', async () => {
    const r = await notImplementedPorts.webResearch.search({ query: 'co2' });
    assert.equal(r.code, 'NOT_IMPLEMENTED');
  });

  it('workflow and ACL smoke', () => {
    assert.equal(canTransition('in_review', 'approved'), true);
    assert.equal(canPublish('approved'), true);
    const deny = evaluateKnowledgeAcl(
      {
        securityClassification: 'INTERNAL_RESTRICTED',
        allowAiUse: true,
        publicationStatus: 'published',
      },
      { role: 'student', channel: 'portal_chat' },
    );
    assert.equal(deny.allow, false);
  });
});
