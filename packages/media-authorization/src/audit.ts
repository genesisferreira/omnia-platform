import type { MediaAuditPort } from './ports';

export function createNoopMediaAudit(): MediaAuditPort {
  return { async record() {} };
}

export function createMemoryMediaAudit(): MediaAuditPort & {
  events: Array<Parameters<MediaAuditPort['record']>[0]>;
} {
  const events: Array<Parameters<MediaAuditPort['record']>[0]> = [];
  return {
    events,
    async record(input) {
      events.push(input);
    },
  };
}
