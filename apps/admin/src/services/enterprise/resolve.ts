import type { Payload } from 'payload';
import {
  assertAssistantAllowed,
  evaluatePolicies,
  resolveAssistantRuntime,
  type PolicySubject,
  type ResolvedAssistantRuntime,
} from '@omnia/enterprise-ai';

import { loadAiModels, loadAssistants, loadPolicies, loadPrompts } from './registry';

export async function listAllowedAssistants(
  payload: Payload,
  subject: PolicySubject,
) {
  const [assistants, policies] = await Promise.all([
    loadAssistants(payload),
    loadPolicies(payload),
  ]);
  const evaluated = evaluatePolicies({ policies, assistants, subject });
  return evaluated;
}

export async function resolveAssistantForAsk(
  payload: Payload,
  input: {
    assistantId?: string | null;
    subject: PolicySubject;
  },
): Promise<ResolvedAssistantRuntime> {
  const [assistants, models, prompts, policies] = await Promise.all([
    loadAssistants(payload),
    loadAiModels(payload),
    loadPrompts(payload),
    loadPolicies(payload),
  ]);

  if (!assistants.length) {
    throw new Error('ENTERPRISE_REGISTRY_EMPTY');
  }

  const evaluated = evaluatePolicies({
    policies,
    assistants,
    subject: input.subject,
  });

  const key = (input.assistantId || 'tutor').trim() || 'tutor';
  const assistant = assertAssistantAllowed(key, evaluated.allowedAssistants);

  return resolveAssistantRuntime({
    assistant,
    models,
    prompts,
    allowedModelKeys: evaluated.allowedModelKeys,
  });
}
