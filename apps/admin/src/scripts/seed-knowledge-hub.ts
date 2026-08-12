/**
 * Seed controlado: categorias sugeridas + agentes ACL.
 * Não importa documentos técnicos nem gera embeddings.
 *
 * Uso: pnpm --filter @omnia/admin seed:knowledge-hub
 */
import { getPayload } from 'payload';

import { AGENT_KEYS, SUGGESTED_CATEGORY_NAMES } from '@omnia/neurofrigo-knowledge';

import config from '../../payload.config';

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const payload = await getPayload({ config });

  for (const [index, name] of SUGGESTED_CATEGORY_NAMES.entries()) {
    const slug = slugify(name);
    const existing = await payload.find({
      collection: 'knowledge-categories',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length) continue;
    await payload.create({
      collection: 'knowledge-categories',
      data: {
        name,
        slug,
        active: true,
        sortOrder: index + 1,
      },
      overrideAccess: true,
    });
  }

  const agentLabels: Record<string, string> = {
    concierge: 'Concierge',
    tutor: 'Tutor',
    refrigeration: 'Refrigeração',
    'neurofrigo-technology': 'Neurofrigo Technology',
    'electrical-controls': 'Comandos Elétricos',
    evaluator: 'Avaliador',
    radar: 'Radar',
    'projects-lab': 'Projetos e Lab',
    'content-production': 'Produção de Conteúdo',
    commercial: 'Comercial',
    support: 'Suporte',
    command: 'Command (super_admin)',
  };

  for (const key of AGENT_KEYS) {
    const existing = await payload.find({
      collection: 'knowledge-agent-access',
      where: { agentKey: { equals: key } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs.length) continue;
    await payload.create({
      collection: 'knowledge-agent-access',
      data: {
        agentKey: key,
        displayName: agentLabels[key] ?? key,
        canUseWebResearch: false,
        canUseUnpublished: key === 'command',
        active: true,
      },
      overrideAccess: true,
    });
  }

  await payload.updateGlobal({
    slug: 'neurofrigo-knowledge-settings',
    data: {
      knowledgeHubEnabled: true,
      ingestionMode: 'manual',
      requireHumanApproval: true,
      allowWebResearch: false,
      allowAutomaticPromotionFromWeb: false,
      processingMode: 'controlled',
      commandAllowedRoles: ['super_admin'],
      futureEmbeddingProvider: 'deepseek',
      futureVectorStore: 'placeholder',
    },
    overrideAccess: true,
  });

  payload.logger.info('knowledge.hub.seed_complete');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
