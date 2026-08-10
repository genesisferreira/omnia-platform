import type { PromptKind, PromptStatus, PromptVersionRecord } from '../domain/types';

/**
 * Calcula o estado de rollback: desativa a versão ativa do kind e reativa a anterior.
 * Puro — o adapter CMS aplica as mutações.
 */
export function planPromptRollback(input: {
  prompts: PromptVersionRecord[];
  assistantKey: string;
  kind: PromptKind;
}): {
  retireId: string | null;
  activateId: string | null;
  fromVersion: number | null;
  toVersion: number | null;
} {
  const rows = input.prompts
    .filter((p) => p.assistantKey === input.assistantKey && p.kind === input.kind)
    .slice()
    .sort((a, b) => b.version - a.version);

  const active = rows.find((p) => p.active || p.status === 'active');
  if (!active) {
    return { retireId: null, activateId: null, fromVersion: null, toVersion: null };
  }

  const previous = rows.find((p) => p.version < active.version);
  if (!previous) {
    return {
      retireId: active.id,
      activateId: null,
      fromVersion: active.version,
      toVersion: null,
    };
  }

  return {
    retireId: active.id,
    activateId: previous.id,
    fromVersion: active.version,
    toVersion: previous.version,
  };
}

export function applyPromptStatus(
  prompt: PromptVersionRecord,
  status: PromptStatus,
): PromptVersionRecord {
  return {
    ...prompt,
    status,
    active: status === 'active',
  };
}
