import type { Payload } from 'payload';
import {
  defaultAssistantRouter,
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
  return defaultAssistantRouter.listAllowed({
    subject,
    registries: { assistants, policies },
  });
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

  return defaultAssistantRouter.route({
    assistantId: input.assistantId,
    subject: input.subject,
    registries: { assistants, models, prompts, policies },
  });
}
