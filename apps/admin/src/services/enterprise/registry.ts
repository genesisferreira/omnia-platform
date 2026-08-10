import type { Payload } from 'payload';
import type {
  AiModelRecord,
  AiPolicyRecord,
  AssistantRecord,
  PromptKind,
  PromptStatus,
  PromptVersionRecord,
} from '@omnia/enterprise-ai';

function relIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => {
      if (v == null) return null;
      if (typeof v === 'object' && 'id' in v) return String((v as { id: unknown }).id);
      return String(v);
    })
    .filter(Boolean) as string[];
}

function relId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'object' && value && 'id' in value) {
    return String((value as { id: unknown }).id);
  }
  return String(value);
}

function modelKeyFromRel(value: unknown, byId: Map<string, AiModelRecord>): string | null {
  const id = relId(value);
  if (!id) return null;
  return byId.get(id)?.key ?? null;
}

export async function loadAiModels(payload: Payload): Promise<AiModelRecord[]> {
  const res = await payload.find({
    collection: 'ai-models',
    limit: 100,
    overrideAccess: true,
  });
  return res.docs.map((d) => ({
    id: String(d.id),
    key: String(d.key),
    provider: String(d.provider),
    model: String(d.model),
    estimatedCostPer1kTokens: Number(d.estimatedCostPer1kTokens || 0),
    maxContextTokens: Number(d.maxContextTokens || 8000),
    defaultTemperature: Number(d.defaultTemperature ?? 0.2),
    capabilities: Array.isArray(d.capabilities)
      ? d.capabilities.map(String)
      : [],
    status: (d.status as 'active' | 'disabled') || 'active',
    priority: Number(d.priority || 0),
  }));
}

export async function loadAssistants(payload: Payload): Promise<AssistantRecord[]> {
  const models = await loadAiModels(payload);
  const byId = new Map(models.map((m) => [m.id, m]));
  const res = await payload.find({
    collection: 'ai-assistants',
    limit: 100,
    depth: 1,
    overrideAccess: true,
  });

  return res.docs.map((d) => {
    const cfg = (d.config || {}) as Record<string, unknown>;
    const allowed = relIds(d.allowedModels)
      .map((id) => byId.get(id)?.key)
      .filter(Boolean) as string[];
    const defaultModelKey = modelKeyFromRel(cfg.defaultModel, byId);
    const key = String(d.key);
    return {
      id: String(d.id),
      key,
      slug: String(d.slug || key),
      name: String(d.name),
      description: String(d.description || ''),
      ownerCompanyId: relId(d.ownerCompany),
      category: d.category as AssistantRecord['category'],
      version: String(d.version || '1.0.0'),
      status: d.status as AssistantRecord['status'],
      icon: d.icon != null ? String(d.icon) : null,
      avatar: d.avatar != null ? String(d.avatar) : null,
      color: d.color != null ? String(d.color) : null,
      visibility: (d.visibility as AssistantRecord['visibility']) || 'public',
      language: String(d.language || 'pt-BR'),
      promptVersion: d.promptVersion != null ? String(d.promptVersion) : null,
      modelProfile: d.modelProfile != null ? String(d.modelProfile) : null,
      allowedModelKeys: allowed,
      defaultContext: d.defaultContext != null ? String(d.defaultContext) : null,
      capabilities: Array.isArray(d.capabilities) ? d.capabilities.map(String) : [],
      config: {
        defaultModelKey,
        temperature: Number(cfg.temperature ?? 0.2),
        maxContextChunks: Number(cfg.maxContextChunks ?? 6),
        maxPromptTokens: Number(cfg.maxPromptTokens ?? 3500),
        maxCompletionTokens: Number(cfg.maxCompletionTokens ?? 800),
        minSimilarity: Number(cfg.minSimilarity ?? 0.35),
        requireCitations: cfg.requireCitations !== false,
        defaultLanguage: String(cfg.defaultLanguage || 'pt-BR'),
        fallbackBehavior:
          (cfg.fallbackBehavior as AssistantRecord['config']['fallbackBehavior']) ||
          'not_found',
      },
    };
  });
}

export async function loadPrompts(payload: Payload): Promise<PromptVersionRecord[]> {
  const assistants = await payload.find({
    collection: 'ai-assistants',
    limit: 100,
    overrideAccess: true,
  });
  const keyById = new Map(assistants.docs.map((a) => [String(a.id), String(a.key)]));

  const res = await payload.find({
    collection: 'ai-prompts',
    limit: 500,
    overrideAccess: true,
  });

  return res.docs
    .map((d) => {
      const assistantId = relId(d.assistant);
      const assistantKey = assistantId ? keyById.get(assistantId) : null;
      if (!assistantKey) return null;
      const status = (d.status as PromptStatus) || (d.active ? 'active' : 'retired');
      return {
        id: String(d.id),
        assistantKey,
        kind: d.kind as PromptKind,
        version: Number(d.version || 1),
        body: String(d.body || ''),
        active: Boolean(d.active) || status === 'active',
        status,
        author: d.author != null ? String(d.author) : null,
        changelog: d.changelog != null ? String(d.changelog) : null,
        createdAt: d.createdAt ? String(d.createdAt) : undefined,
      };
    })
    .filter(Boolean) as PromptVersionRecord[];
}

export async function loadPolicies(payload: Payload): Promise<AiPolicyRecord[]> {
  const [assistants, models] = await Promise.all([
    payload.find({ collection: 'ai-assistants', limit: 100, overrideAccess: true }),
    payload.find({ collection: 'ai-models', limit: 100, overrideAccess: true }),
  ]);
  const aKey = new Map(assistants.docs.map((a) => [String(a.id), String(a.key)]));
  const mKey = new Map(models.docs.map((m) => [String(m.id), String(m.key)]));

  const res = await payload.find({
    collection: 'ai-policies',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  return res.docs.map((d) => ({
    id: String(d.id),
    name: String(d.name),
    assistantKeys: relIds(d.assistants)
      .map((id) => aKey.get(id))
      .filter(Boolean) as string[],
    companyIds: relIds(d.companies),
    roles: Array.isArray(d.roles) ? d.roles.map(String) : [],
    courseIds: relIds(d.courses),
    tenantIds: relIds(d.tenants),
    allowedModelKeys: relIds(d.allowedModels)
      .map((id) => mKey.get(id))
      .filter(Boolean) as string[],
    requireGrounding: d.requireGrounding !== false,
    requireExplainability: d.requireExplainability !== false,
    maxTokensPerDay:
      d.maxTokensPerDay != null && Number(d.maxTokensPerDay) > 0
        ? Number(d.maxTokensPerDay)
        : null,
    priority: Number(d.priority || 0),
    enabled: d.enabled !== false,
  }));
}
