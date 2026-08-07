import { evaluateAssessmentIntegrity } from '../guards/assessment-integrity';
import { evaluatePurposeGuard, normalizeProfile } from '../guards/purpose';
import { evaluateSecurityGuard } from '../guards/security';
import { classifyOrchestratorIntent } from '../intent/classify';
import { routePortalAgent } from '../router/agent-router';
import type { OrchestratorPlan, OrchestratorTraceEvent, ProfileKind } from '../domain/types';

function push(
  events: OrchestratorTraceEvent[],
  type: string,
  detail?: Record<string, unknown>,
) {
  events.push({ type, at: new Date().toISOString(), detail });
}

/**
 * Pipeline Portal Orchestrator (sem tools externas / sem autonomia).
 * Identity → Purpose → Intent → Security → Agent Router → Assessment Integrity
 */
export function planPortalTurn(input: {
  question: string;
  role?: string | null;
  preferredAssistantKey?: string | null;
  allowedAssistantKeys: string[];
  enrolled?: boolean;
  courseId?: string | null;
}): OrchestratorPlan {
  const events: OrchestratorTraceEvent[] = [];
  push(events, 'ai.request.started', { channel: 'portal' });

  const profile: ProfileKind = normalizeProfile(input.role);
  push(events, 'ai.identity.resolved', { profile });

  const purpose = evaluatePurposeGuard({ question: input.question, profile });
  if (!purpose.allow) {
    push(events, purpose.event, { code: purpose.code });
    return {
      profile,
      intent: 'general',
      intentConfidence: 0,
      agent: {
        assistantKey: 'support',
        displayName: 'Suporte',
        intent: 'general',
        reason: 'purpose_denied',
      },
      blocked: true,
      blockReason: purpose.message,
      blockCode: purpose.code,
      events,
      assessmentIntegrity: false,
    };
  }

  const intentHit = classifyOrchestratorIntent(input.question);
  push(events, 'ai.intent.classified', {
    intent: intentHit.intent,
    confidence: intentHit.confidence,
  });

  const security = evaluateSecurityGuard(input.question);
  if (!security.allow) {
    push(events, security.event, { code: security.code });
    return {
      profile,
      intent: intentHit.intent,
      intentConfidence: intentHit.confidence,
      agent: {
        assistantKey: 'support',
        displayName: 'Suporte',
        intent: intentHit.intent,
        reason: 'security_denied',
      },
      blocked: true,
      blockReason: security.message,
      blockCode: security.code,
      events,
      assessmentIntegrity: false,
    };
  }

  const enrolled = Boolean(input.enrolled ?? (input.courseId != null && input.courseId !== ''));
  const agent = routePortalAgent({
    intent: intentHit.intent,
    profile,
    allowedAssistantKeys: input.allowedAssistantKeys,
    preferredAssistantKey: input.preferredAssistantKey,
    enrolled,
  });
  push(events, 'ai.agent.routed', {
    assistantKey: agent.assistantKey,
    reason: agent.reason,
  });

  const integrity = evaluateAssessmentIntegrity({
    question: input.question,
    profile,
    assistantKey: agent.assistantKey,
  });
  if (!integrity.allow) {
    push(events, integrity.event, { code: integrity.code });
    return {
      profile,
      intent: intentHit.intent,
      intentConfidence: intentHit.confidence,
      agent,
      blocked: true,
      blockReason: integrity.message,
      blockCode: integrity.code,
      events,
      assessmentIntegrity: true,
    };
  }

  return {
    profile,
    intent: intentHit.intent,
    intentConfidence: intentHit.confidence,
    agent,
    blocked: false,
    blockReason: null,
    blockCode: null,
    events,
    assessmentIntegrity: integrity.triggered,
  };
}
