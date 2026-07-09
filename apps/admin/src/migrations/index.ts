import * as migration_20260709_181730 from './20260709_181730';

export const migrations = [
  {
    up: migration_20260709_181730.up,
    down: migration_20260709_181730.down,
    name: '20260709_181730'
  },
];
