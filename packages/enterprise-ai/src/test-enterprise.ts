import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { composeSystemPrompt } from './prompts/compose';
import { planPromptRollback } from './prompts/rollback';
import { assertAssistantAllowed, evaluatePolicies } from './policy/engine';
import { resolveAssistantRuntime } from './resolve/resolve-runtime';
import { AssistantRouter } from './router/assistant-router';
import type {
  AiModelRecord,
  AiPolicyRecord,
  AssistantRecord,
  PromptVersionRecord,
} from './domain/types';

const tutor: AssistantRecord = {
  id: '1',
  key: 'tutor',
  slug: 'tutor',
  name: 'Tutor IA',
  description: 'Tutor de aprendizagem',
  ownerCompanyId: null,
  category: 'tutor',
  version: '1.0.0',
  status: 'active',
  icon: null,
  avatar: null,
  color: '#0B6E4F',
  visibility: 'public',
  language: 'pt-BR',
  promptVersion: '1',
  modelProfile: 'grounded-default',
  allowedModelKeys: ['grounded-default'],
  defaultContext: 'Foque em educação técnica.',
  capabilities: ['rag', 'citations', 'study_plan'],
  config: {
    defaultModelKey: 'grounded-default',
    temperature: 0.2,
    maxContextChunks: 6,
    maxPromptTokens: 3500,
    maxCompletionTokens: 800,
    minSimilarity: 0.35,
    requireCitations: true,
    defaultLanguage: 'pt-BR',
    fallbackBehavior: 'not_found',
  },
};

const commercial: AssistantRecord = {
  ...tutor,
  id: '2',
  key: 'commercial',
  slug: 'commercial',
  name: 'Comercial IA',
  category: 'commercial',
  visibility: 'internal',
  capabilities: ['rag', 'citations'],
  config: { ...tutor.config, temperature: 0.5 },
};

const models: AiModelRecord[] = [
  {
    id: 'm1',
    key: 'grounded-default',
    provider: 'grounded',
    model: 'grounded-extractive-v1',
    estimatedCostPer1kTokens: 0,
    maxContextTokens: 8000,
    defaultTemperature: 0.2,
    capabilities: ['extractive'],
    status: 'active',
    priority: 100,
  },
  {
    id: 'm2',
    key: 'deepseek-chat',
    provider: 'deepseek',
    model: 'deepseek-chat',
    estimatedCostPer1kTokens: 0.001,
    maxContextTokens: 64000,
    defaultTemperature: 0.3,
    capabilities: ['chat'],
    status: 'active',
    priority: 50,
  },
];

const prompts: PromptVersionRecord[] = [
  {
    id: 'p1',
    assistantKey: 'tutor',
    kind: 'system',
    version: 1,
    body: 'Você é o Tutor Omnia v1.',
    active: false,
    status: 'retired',
  },
  {
    id: 'p2',
    assistantKey: 'tutor',
    kind: 'system',
    version: 2,
    body: 'Você é o Tutor Omnia v2.',
    active: true,
    status: 'active',
    author: 'qa',
  },
  {
    id: 'p3',
    assistantKey: 'tutor',
    kind: 'security',
    version: 1,
    body: 'Nunca invente conteúdo fora das fontes.',
    active: true,
    status: 'active',
  },
];

describe('enterprise-ai', () => {
  it('composes versioned prompts preferring highest active', () => {
    const system = composeSystemPrompt(prompts);
    assert.ok(system.includes('SYSTEM'));
    assert.ok(system.includes('SECURITY'));
    assert.ok(system.includes('Tutor Omnia v2'));
    assert.ok(!system.includes('Tutor Omnia v1'));
  });

  it('plans prompt rollback to previous version', () => {
    const plan = planPromptRollback({
      prompts,
      assistantKey: 'tutor',
      kind: 'system',
    });
    assert.equal(plan.retireId, 'p2');
    assert.equal(plan.activateId, 'p1');
    assert.equal(plan.fromVersion, 2);
    assert.equal(plan.toVersion, 1);
  });

  it('evaluates policies by role and company', () => {
    const policies: AiPolicyRecord[] = [
      {
        id: 'pol1',
        name: 'Alunos veem Tutor',
        assistantKeys: ['tutor'],
        companyIds: [],
        roles: ['student'],
        courseIds: [],
        tenantIds: [],
        allowedModelKeys: ['grounded-default'],
        requireGrounding: true,
        requireExplainability: true,
        maxTokensPerDay: 10000,
        priority: 10,
        enabled: true,
      },
    ];
    const student = evaluatePolicies({
      policies,
      assistants: [tutor, commercial],
      subject: { role: 'student' },
    });
    assert.equal(student.allowedAssistants.length, 1);
    assert.equal(student.allowedAssistants[0]!.key, 'tutor');
    assert.equal(student.requireGrounding, true);
    assert.throws(() => assertAssistantAllowed('commercial', student.allowedAssistants));
  });

  it('resolves runtime config from registries with multi-model priority', () => {
    const resolved = resolveAssistantRuntime({
      assistant: tutor,
      models,
      prompts,
    });
    assert.equal(resolved.model?.key, 'grounded-default');
    assert.ok(resolved.systemPrompt.includes('Tutor Omnia v2'));
    assert.ok(resolved.systemPrompt.includes('educação'));
    assert.equal(resolved.limits.maxContextChunks, 6);
    assert.equal(resolved.temperature, 0.2);
    assert.equal(resolved.requireGrounding, true);
  });

  it('routes via AssistantRouter with policy audit', () => {
    const router = new AssistantRouter();
    const policies: AiPolicyRecord[] = [
      {
        id: 'pol-staff',
        name: 'Staff',
        assistantKeys: ['tutor', 'commercial'],
        companyIds: [],
        roles: ['admin'],
        courseIds: [],
        tenantIds: [],
        allowedModelKeys: ['grounded-default', 'deepseek-chat'],
        requireGrounding: true,
        requireExplainability: true,
        maxTokensPerDay: null,
        priority: 50,
        enabled: true,
      },
    ];
    const routed = router.route({
      assistantId: 'commercial',
      subject: { role: 'admin' },
      registries: {
        assistants: [tutor, commercial],
        models,
        prompts,
        policies,
      },
    });
    assert.equal(routed.assistant.key, 'commercial');
    assert.equal(routed.temperature, 0.5);
    assert.equal(routed.policyDecision.allowed, true);
    assert.equal(routed.policyDecision.assistantKey, 'commercial');
    assert.ok(routed.policyDecision.matchedPolicyIds.includes('pol-staff'));
  });

  it('denies forbidden assistant via router', () => {
    const router = new AssistantRouter();
    const policies: AiPolicyRecord[] = [
      {
        id: 'pol-student',
        name: 'Student',
        assistantKeys: ['tutor'],
        companyIds: [],
        roles: ['student'],
        courseIds: [],
        tenantIds: [],
        allowedModelKeys: ['grounded-default'],
        requireGrounding: true,
        requireExplainability: true,
        maxTokensPerDay: null,
        priority: 20,
        enabled: true,
      },
    ];
    assert.throws(() =>
      router.route({
        assistantId: 'commercial',
        subject: { role: 'student' },
        registries: {
          assistants: [tutor, commercial],
          models,
          prompts,
          policies,
        },
      }),
    );
  });
});
