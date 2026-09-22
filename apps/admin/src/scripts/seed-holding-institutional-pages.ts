/* eslint-disable no-console -- CLI seed output */
/**
 * Seed exclusivo das páginas institucionais (omnia-hub: sobre, empresas, contato).
 * Não executa tenants, companies, sites, domains, global-settings, Home nem migrations.
 */
import { getPayload } from 'payload';

import config from '../../payload.config';
import {
  adaptPayloadForInstitutionalPagesSeed,
  formatHoldingInstitutionalPagesSeedLog,
  hasInstitutionalPagesSeedAbort,
  runHoldingInstitutionalPagesSeed,
} from '../seed/run-holding-institutional-pages';

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const outcome = await runHoldingInstitutionalPagesSeed(
    adaptPayloadForInstitutionalPagesSeed(payload),
  );

  console.log(formatHoldingInstitutionalPagesSeedLog(outcome));

  if (hasInstitutionalPagesSeedAbort(outcome)) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch(() => {
  console.error('holding-institutional-pages: error');
  process.exit(1);
});
