import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluateKnowledgeAcl } from './acl';
import { canPublish, canTransition, requiresHumanReview } from './workflow';

describe('knowledge workflow', () => {
  it('allows draft → in_review', () => {
    assert.equal(canTransition('draft', 'in_review'), true);
  });

  it('blocks draft → published', () => {
    assert.equal(canTransition('draft', 'published'), false);
  });

  it('canPublish only from approved/indexed', () => {
    assert.equal(canPublish('approved'), true);
    assert.equal(canPublish('draft'), false);
  });

  it('requires human review for high risk', () => {
    assert.equal(requiresHumanReview({ technicalRiskLevel: 'high' }), true);
  });

  it('requires human review for INTERNAL_RESTRICTED', () => {
    assert.equal(
      requiresHumanReview({ securityClassification: 'INTERNAL_RESTRICTED' }),
      true,
    );
  });

  it('blocks publish path without prior approval states when review required', () => {
    // Máquina já impede draft→published; in_review→published também inválido
    assert.equal(canTransition('in_review', 'published'), false);
    assert.equal(canTransition('in_review', 'approved'), true);
    assert.equal(canTransition('approved', 'published'), true);
  });
});

describe('knowledge ACL', () => {
  it('denies INTERNAL_RESTRICTED on portal chat', () => {
    const d = evaluateKnowledgeAcl(
      {
        securityClassification: 'INTERNAL_RESTRICTED',
        allowAiUse: true,
        publicationStatus: 'published',
      },
      { role: 'student', channel: 'portal_chat' },
    );
    assert.equal(d.allow, false);
    assert.equal(d.code, 'DENY_CHAT_INTERNAL');
  });

  it('denies command agent without super_admin', () => {
    const d = evaluateKnowledgeAcl(
      {
        securityClassification: 'PUBLIC',
        allowAiUse: true,
        publicationStatus: 'published',
      },
      { role: 'admin', agentKey: 'command', channel: 'portal_chat' },
    );
    assert.equal(d.allow, false);
    assert.equal(d.code, 'DENY_COMMAND');
  });

  it('requires enrollment for course-bound student content', () => {
    const d = evaluateKnowledgeAcl(
      {
        securityClassification: 'STUDENT',
        allowAiUse: true,
        publicationStatus: 'published',
        requiresEnrollment: true,
        allowedCourses: [42],
      },
      { role: 'student', channel: 'portal_chat', enrolledCourseIds: [1] },
    );
    assert.equal(d.allow, false);
    assert.equal(d.code, 'DENY_ENROLLMENT');
  });

  it('allows command channel for super_admin', () => {
    const d = evaluateKnowledgeAcl(
      {
        securityClassification: 'INTERNAL_RESTRICTED',
        allowAiUse: false,
      },
      { role: 'super_admin', channel: 'command' },
    );
    assert.equal(d.allow, true);
  });
});
