/* eslint-disable no-console -- CLI upgrade output */
/**
 * Atualizador exclusivo da Home institucional (omnia-hub).
 * Não executa tenants, companies, sites, domains, global-settings nem migrations.
 */
import { getPayload } from 'payload';

import config from '../../payload.config';
import {
  adaptPayloadForHoldingHomeUpgrade,
  formatHoldingHomeUpgradeLog,
  runHoldingHomeUpgrade,
} from '../seed/upgrade-holding-home';

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const outcome = await runHoldingHomeUpgrade(adaptPayloadForHoldingHomeUpgrade(payload));

  console.log(formatHoldingHomeUpgradeLog(outcome));

  if (outcome.status === 'aborted') {
    process.exit(1);
  }

  process.exit(0);
}

main().catch(() => {
  console.error('holding-home-upgrade: error');
  process.exit(1);
});
