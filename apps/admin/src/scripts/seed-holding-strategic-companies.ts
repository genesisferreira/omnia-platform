/* eslint-disable no-console -- CLI seed output */
import { getPayload } from 'payload';

import config from '../../payload.config';
import {
  adaptPayloadForStrategicCompanies,
  formatHoldingStrategicCompaniesLog,
  runHoldingStrategicCompaniesSeed,
} from '../seed/run-holding-strategic-companies';

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const outcome = await runHoldingStrategicCompaniesSeed(
    adaptPayloadForStrategicCompanies(payload),
  );
  console.log(formatHoldingStrategicCompaniesLog(outcome));
  process.exit(0);
}

main().catch(() => {
  console.error('holding-strategic-companies: error');
  process.exit(1);
});
