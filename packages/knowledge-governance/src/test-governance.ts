import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canApproveOmnia,
  canApproveSchool,
  canTransitionGovernance,
  evaluateRetrievalEligibility,
  filterHitsByGovernance,
  GOVERNANCE_STATE_LABELS_PT,
  hashContentVersion,
  isAssessmentSecretContent,
  isAgentAuthorizedForOmniaScope,
  isHubIngestionEligible,
  isRetrievalEligibleState,
  schoolApprovedLabel,
  stateAfterMaterialEdit,
  versionsMatch,
} from './index';

describe('governance state machine', () => {
  it('allows COURSE_PRIVATE → PENDING_SCHOOL_REVIEW', () => {
    assert.equal(canTransitionGovernance('COURSE_PRIVATE', 'PENDING_SCHOOL_REVIEW'), true);
  });

  it('denies DRAFT → OMNIA_APPROVED', () => {
    assert.equal(canTransitionGovernance('DRAFT', 'OMNIA_APPROVED'), false);
  });

  it('allows SCHOOL_APPROVED → PENDING_OMNIA_REVIEW → OMNIA_APPROVED', () => {
    assert.equal(canTransitionGovernance('SCHOOL_APPROVED', 'PENDING_OMNIA_REVIEW'), true);
    assert.equal(canTransitionGovernance('PENDING_OMNIA_REVIEW', 'OMNIA_APPROVED'), true);
  });

  it('allows revoke from approved states', () => {
    assert.equal(canTransitionGovernance('SCHOOL_APPROVED', 'REVOKED'), true);
    assert.equal(canTransitionGovernance('OMNIA_APPROVED', 'REVOKED'), true);
  });

  it('technical_reviewer can school approve; not omnia alone', () => {
    assert.equal(canApproveSchool('technical_reviewer'), true);
    assert.equal(canApproveOmnia('technical_reviewer'), false);
    assert.equal(canApproveOmnia('neurofrigo_admin'), true);
  });

  it('ingestion/retrieval eligibility only for approved scopes', () => {
    assert.equal(isHubIngestionEligible('COURSE_PRIVATE'), false);
    assert.equal(isHubIngestionEligible('SCHOOL_APPROVED'), true);
    assert.equal(isRetrievalEligibleState('REVOKED'), false);
    assert.equal(isRetrievalEligibleState('OMNIA_APPROVED'), true);
  });

  it('version edit invalidates approval to COURSE_PRIVATE', () => {
    assert.equal(stateAfterMaterialEdit('SCHOOL_APPROVED'), 'COURSE_PRIVATE');
    assert.equal(stateAfterMaterialEdit('OMNIA_APPROVED'), 'COURSE_PRIVATE');
    assert.equal(stateAfterMaterialEdit('PENDING_SCHOOL_REVIEW'), 'COURSE_PRIVATE');
  });
});

describe('version integrity', () => {
  it('hashes are stable and detect drift', () => {
    const a = hashContentVersion(['lesson', 1, 'hello']);
    const b = hashContentVersion(['lesson', 1, 'hello']);
    const c = hashContentVersion(['lesson', 1, 'hello!']);
    assert.equal(a, b);
    assert.equal(versionsMatch(a, b), true);
    assert.equal(versionsMatch(a, c), false);
  });

  it('detects assessment secrets', () => {
    assert.equal(isAssessmentSecretContent({ title: 'Gabarito oficial aula 1' }), true);
    assert.equal(isAssessmentSecretContent({ tags: ['gabarito'] }), true);
    assert.equal(isAssessmentSecretContent({ title: 'Introdução à refrigeração' }), false);
  });
});

describe('retrieval scope enforcement', () => {
  const fredPrivate = {
    knowledgeScope: 'COURSE_PRIVATE' as const,
    schoolKey: 'fred-do-frio',
    courseId: 10,
    retrievalEligible: true,
    allowAiUse: true,
  };
  const fredSchool = {
    knowledgeScope: 'SCHOOL_APPROVED' as const,
    schoolKey: 'fred-do-frio',
    retrievalEligible: true,
    allowAiUse: true,
  };
  const omnia = {
    knowledgeScope: 'OMNIA_APPROVED' as const,
    schoolKey: null,
    retrievalEligible: true,
    allowAiUse: true,
  };

  it('Fred student course private ALLOW; CTE DENY', () => {
    const fred = evaluateRetrievalEligibility(fredPrivate, {
      schoolKey: 'fred-do-frio',
      agentKey: 'tutor',
      channel: 'tutor',
      activeCourseId: 10,
    });
    const cte = evaluateRetrievalEligibility(fredPrivate, {
      schoolKey: 'cte',
      agentKey: 'tutor',
      channel: 'tutor',
      activeCourseId: 10,
    });
    assert.equal(fred.allow, true);
    assert.equal(cte.allow, false);
    assert.equal(cte.code, 'DENY_SCHOOL');
  });

  it('Fred school approved ALLOW; CTE DENY', () => {
    assert.equal(
      evaluateRetrievalEligibility(fredSchool, {
        schoolKey: 'fred-do-frio',
        agentKey: 'tutor',
        channel: 'portal_chat',
      }).allow,
      true,
    );
    assert.equal(
      evaluateRetrievalEligibility(fredSchool, {
        schoolKey: 'cte',
        agentKey: 'tutor',
        channel: 'portal_chat',
      }).allow,
      false,
    );
  });

  it('authorized Omnia agent ALLOW; commercial DENY', () => {
    assert.equal(isAgentAuthorizedForOmniaScope('engineering'), true);
    assert.equal(isAgentAuthorizedForOmniaScope('commercial'), false);
    assert.equal(
      evaluateRetrievalEligibility(omnia, {
        agentKey: 'engineering',
        channel: 'portal_chat',
      }).allow,
      true,
    );
    assert.equal(
      evaluateRetrievalEligibility(omnia, {
        agentKey: 'commercial',
        channel: 'portal_chat',
      }).allow,
      false,
    );
  });

  it('cross-tenant DENY', () => {
    const d = evaluateRetrievalEligibility(
      { ...fredSchool, tenantId: 't1' },
      { schoolKey: 'fred-do-frio', tenantId: 't2', agentKey: 'tutor', channel: 'portal_chat' },
    );
    assert.equal(d.allow, false);
    assert.equal(d.code, 'DENY_TENANT');
  });

  it('revoked / not eligible DENY', () => {
    assert.equal(
      evaluateRetrievalEligibility(
        { ...fredSchool, retrievalEligible: false },
        { schoolKey: 'fred-do-frio', agentKey: 'tutor', channel: 'portal_chat' },
      ).allow,
      false,
    );
  });

  it('assessment secret never retrievable', () => {
    const d = evaluateRetrievalEligibility(
      { ...fredSchool, assessmentSecret: true },
      { schoolKey: 'fred-do-frio', agentKey: 'tutor', channel: 'portal_chat' },
    );
    assert.equal(d.allow, false);
    assert.equal(d.code, 'DENY_ASSESSMENT_SECRET');
  });

  it('filterHitsByGovernance applies before return', () => {
    const hits = [
      { record: fredSchool, similarity: 0.9 },
      { record: { ...fredSchool, schoolKey: 'cte' }, similarity: 0.8 },
    ];
    const filtered = filterHitsByGovernance(hits, {
      schoolKey: 'fred-do-frio',
      agentKey: 'tutor',
      channel: 'portal_chat',
    });
    assert.equal(filtered.length, 1);
  });

  it('COURSE_PRIVATE denied to commercial', () => {
    const d = evaluateRetrievalEligibility(fredPrivate, {
      schoolKey: 'fred-do-frio',
      agentKey: 'commercial',
      channel: 'portal_chat',
      activeCourseId: 10,
    });
    assert.equal(d.allow, false);
  });
});

describe('labels', () => {
  it('exposes Portuguese labels without jargon', () => {
    assert.equal(GOVERNANCE_STATE_LABELS_PT.COURSE_PRIVATE, 'Privado do curso');
    assert.equal(schoolApprovedLabel('fred-do-frio'), 'Aprovado para Fred');
    assert.equal(schoolApprovedLabel('cte'), 'Aprovado para CTE');
  });
});
