/* eslint-disable no-console -- CLI seed output */
/**
 * Seed exclusivo do Blog (omnia-hub: autor, categorias, tags e posts).
 * Não executa tenants, companies, sites, domains, global-settings, Home nem migrations.
 */
import { getPayload } from 'payload';

import config from '../../payload.config';
import {
  adaptPayloadForHoldingBlogSeed,
  formatHoldingBlogSeedLog,
  hasHoldingBlogSeedAbort,
  runHoldingBlogSeed,
} from '../seed/run-holding-blog';

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const outcome = await runHoldingBlogSeed(adaptPayloadForHoldingBlogSeed(payload));

  console.log(formatHoldingBlogSeedLog(outcome));

  if (hasHoldingBlogSeedAbort(outcome)) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch(() => {
  console.error('holding-blog: error');
  process.exit(1);
});
