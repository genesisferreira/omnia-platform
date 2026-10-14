import type { MetadataRoute } from 'next';

import { canonicalPublicOrigin, PRIVATE_PATH_PREFIXES } from './indexing';

/** Crawlers de busca/recuperação. Não inclui bots de treinamento. */
const SEARCH_AGENTS = ['*', 'Googlebot', 'OAI-SearchBot', 'PerplexityBot'] as const;

/** Treinamento de modelos. Não recebem o site. */
const TRAINING_AGENTS = ['GPTBot', 'Google-Extended', 'ClaudeBot'] as const;

export function buildRobotsDocument(origin: string): MetadataRoute.Robots {
  const canonical = canonicalPublicOrigin(origin);
  const searchRule = {
    allow: '/',
    disallow: [...PRIVATE_PATH_PREFIXES],
  };

  return {
    rules: [
      ...SEARCH_AGENTS.map((userAgent) => ({ userAgent, ...searchRule })),
      ...TRAINING_AGENTS.map((userAgent) => ({
        userAgent,
        disallow: '/',
      })),
    ],
    sitemap: `${canonical}/sitemap.xml`,
    host: new URL(canonical).host,
  };
}
