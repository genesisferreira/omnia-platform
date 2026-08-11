import { DEFAULT_ADAPTIVE_POLICY, type AdaptivePolicy } from '../domain/types';

/**
 * Resolve policy com fallback: override → global default.
 * Preparado para tenant/empresa/curso via adapter (sem hardcode institucional).
 */
export function resolveAdaptivePolicy(
  override?: Partial<AdaptivePolicy> | null,
): AdaptivePolicy {
  return {
    ...DEFAULT_ADAPTIVE_POLICY,
    ...(override || {}),
    key: override?.key || DEFAULT_ADAPTIVE_POLICY.key,
    version: override?.version || DEFAULT_ADAPTIVE_POLICY.version,
  };
}
