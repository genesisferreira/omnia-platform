import {
  assertAssistantAllowed,
  buildPolicyDecision,
  evaluatePolicies,
} from '../policy/engine';
import { resolveAssistantRuntime } from '../resolve/resolve-runtime';
import type {
  AiModelRecord,
  AiPolicyRecord,
  AssistantRecord,
  PolicySubject,
  PromptVersionRecord,
  ResolvedAssistantRuntime,
} from '../domain/types';

export type AssistantRouterRegistries = {
  assistants: AssistantRecord[];
  models: AiModelRecord[];
  prompts: PromptVersionRecord[];
  policies: AiPolicyRecord[];
};

/**
 * AssistantRouter — seleciona prompt/modelo/políticas e devolve config para o Runtime.
 * O Runtime permanece assistente-agnóstico.
 */
export class AssistantRouter {
  route(input: {
    assistantId?: string | null;
    subject: PolicySubject;
    registries: AssistantRouterRegistries;
  }): ResolvedAssistantRuntime {
    const { registries } = input;
    if (!registries.assistants.length) {
      throw new Error('ENTERPRISE_REGISTRY_EMPTY');
    }

    const evaluation = evaluatePolicies({
      policies: registries.policies,
      assistants: registries.assistants,
      subject: input.subject,
    });

    const key = (input.assistantId || 'tutor').trim() || 'tutor';
    const assistant = assertAssistantAllowed(key, evaluation.allowedAssistants);

    const resolved = resolveAssistantRuntime({
      assistant,
      models: registries.models,
      prompts: registries.prompts,
      allowedModelKeys: evaluation.allowedModelKeys,
      requireGrounding: evaluation.requireGrounding,
      requireExplainability: evaluation.requireExplainability,
      policyDecision: buildPolicyDecision({
        allowed: true,
        assistantKey: assistant.key,
        modelKey: null,
        evaluation,
        reason: 'assistant_allowed',
      }),
    });

    return {
      ...resolved,
      policyDecision: buildPolicyDecision({
        allowed: true,
        assistantKey: assistant.key,
        modelKey: resolved.model?.key ?? null,
        evaluation,
        reason: 'assistant_routed',
      }),
    };
  }

  listAllowed(input: {
    subject: PolicySubject;
    registries: Pick<AssistantRouterRegistries, 'assistants' | 'policies'>;
  }) {
    return evaluatePolicies({
      policies: input.registries.policies,
      assistants: input.registries.assistants,
      subject: input.subject,
    });
  }
}

export const defaultAssistantRouter = new AssistantRouter();
