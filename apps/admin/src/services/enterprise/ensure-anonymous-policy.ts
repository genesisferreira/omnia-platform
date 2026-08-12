import type { Payload } from 'payload';

/**
 * Ensure Concierge-only policy for anonymous/public portal visitors.
 * Idempotent — does not weaken authenticated policies.
 */
export async function ensureAnonymousConciergePolicy(payload: Payload): Promise<void> {
  const name = 'Anonymous public Concierge';
  const existing = await payload.find({
    collection: 'ai-policies',
    where: { name: { equals: name } },
    limit: 1,
    overrideAccess: true,
  });

  const assistants = await payload.find({
    collection: 'ai-assistants',
    where: {
      and: [{ key: { equals: 'concierge' } }, { status: { equals: 'active' } }],
    },
    limit: 1,
    overrideAccess: true,
  });
  const conciergeId = assistants.docs[0]?.id;
  if (conciergeId == null) return;

  const models = await payload.find({
    collection: 'ai-models',
    where: { status: { equals: 'active' } },
    limit: 5,
    overrideAccess: true,
  });
  const modelIds = models.docs
    .map((d: { id: string | number }) => d.id)
    .filter((id): id is number => typeof id === 'number');

  const data = {
    name,
    assistants: [conciergeId as number],
    roles: ['anonymous', 'visitor'],
    allowedModels: modelIds,
    requireGrounding: true,
    requireExplainability: true,
    priority: 110,
    enabled: true,
  };

  if (existing.docs[0]) {
    await payload.update({
      collection: 'ai-policies',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
    });
    return;
  }

  await payload.create({
    collection: 'ai-policies',
    data,
    overrideAccess: true,
  });
}
