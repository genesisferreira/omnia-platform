import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { composeSystemPrompt } from './prompts/compose';
import { assertAssistantAllowed, evaluatePolicies } from './policy/engine';
import { resolveAssistantRuntime } from './resolve/resolve-runtime';
import type {
  AiModelRecord,
  AiPolicyRecord,
  AssistantRecord,
  PromptVersionRecord,
} from './domain/types';

const tutor: AssistantRecord = {
  id: '1',
  key: 'tutor',
  name: 'Tutor IA',
  description: 'Tutor de aprendizagem',
  ownerCompanyId: null,
  category: 'tutor',
  version: '1.0.0',
  status: 'active',
  icon: null,
  language: 'pt-BR',
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
  name: 'Comercial IA',
  category: 'commercial',
  capabilities: ['rag', 'citations'],
};

const models: AiModelRecord[] = [
  {
    id: 'm1',
    key: 'grounded-default',
    provider: 'grounded',
    model: 'grounded-extractive-v1',
    estimatedCostPer1kTokens: 0,
    maxContextTokens: 8000,
    capabilities: ['extractive'],
    status: 'active',
    priority: 100,
  },
];

const prompts: PromptVersionRecord[] = [
  {
    id: 'p1',
    assistantKey: 'tutor',
    kind: 'system',
    version: 1,
    body: 'Você é o Tutor Omnia.',
    active: true,
  },
  {
    id: 'p2',
    assistantKey: 'tutor',
    kind: 'security',
    version: 1,
    body: 'Nunca invente conteúdo fora das fontes.',
    active: true,
  },
];

describe('enterprise-ai', () => {
  it('composes versioned prompts', () => {
    const system = composeSystemPrompt(prompts);
    assert.ok(system.includes('SYSTEM'));
    assert.ok(system.includes('SECURITY'));
    assert.ok(system.includes('Tutor Omnia'));
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
    assert.throws(() => assertAssistantAllowed('commercial', student.allowedAssistants));
  });

  it('resolves runtime config from registries', () => {
    const resolved = resolveAssistantRuntime({
      assistant: tutor,
      models,
      prompts,
    });
    assert.equal(resolved.model?.key, 'grounded-default');
    assert.ok(resolved.systemPrompt.includes('Tutor Omnia'));
    assert.ok(resolved.systemPrompt.includes('educação'));
    assert.equal(resolved.limits.maxContextChunks, 6);
  });
});
