import * as migration_20260709_181730 from './20260709_181730';
import * as migration_20260713_142511_sites from './20260713_142511_sites';
import * as migration_20260713_174436_domains from './20260713_174436_domains';
import * as migration_20260716_124305_pages from './20260716_124305_pages';

export const migrations = [
  {
    up: migration_20260709_181730.up,
    down: migration_20260709_181730.down,
    name: '20260709_181730',
  },
  {
    up: migration_20260713_142511_sites.up,
    down: migration_20260713_142511_sites.down,
    name: '20260713_142511_sites',
  },
  {
    up: migration_20260713_174436_domains.up,
    down: migration_20260713_174436_domains.down,
    name: '20260713_174436_domains',
  },
  {
    up: migration_20260716_124305_pages.up,
    down: migration_20260716_124305_pages.down,
    name: '20260716_124305_pages',
  },
];
