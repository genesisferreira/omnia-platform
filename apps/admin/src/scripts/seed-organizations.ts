import { getPayload } from 'payload';

import config from '../../payload.config';
import { seedOrganizations } from '../seed/run-organizations';

async function main() {
  const payload = await getPayload({ config });
  const result = await seedOrganizations(payload);
  // eslint-disable-next-line no-console
  console.log(`Organizations seed: created=${result.created} updated=${result.updated}`);
  process.exit(0);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
