/* eslint-disable no-console -- CLI seed output */
/**
 * Seed exclusivo da Home (omnia-hub).
 * Não executa tenants, companies, sites, domains, global-settings nem migrations.
 */
import { getPayload } from 'payload';

import config from '../../payload.config';
import {
  adaptPayloadForHoldingHomeSeed,
  formatHoldingHomeSeedLog,
  runHoldingHomeSeed,
} from '../seed/run-holding-home';

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const outcome = await runHoldingHomeSeed(adaptPayloadForHoldingHomeSeed(payload));

  console.log(formatHoldingHomeSeedLog(outcome));

  if (outcome.status === 'aborted') {
    process.exit(1);
  }

  process.exit(0);
}

main().catch(() => {
  console.error('holding-home: error');
  process.exit(1);
});
