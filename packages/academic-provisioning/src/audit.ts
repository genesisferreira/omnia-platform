import type { ProvisionAuditPort } from './ports';

/** No-op audit para testes unitários. */
export function createNoopAudit(): ProvisionAuditPort {
  return {
    async record() {
      /* noop */
    },
  };
}

/** Audit em memória (captura eventos para asserts). */
export function createMemoryAudit(): ProvisionAuditPort & {
  events: Array<Parameters<ProvisionAuditPort['record']>[0]>;
} {
  const events: Array<Parameters<ProvisionAuditPort['record']>[0]> = [];
  return {
    events,
    async record(input) {
      events.push(input);
    },
  };
}
