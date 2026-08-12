export type {
  MediaAuthorizeCommand,
  MediaCapabilities,
  MediaContext,
  MediaDecision,
  MediaDecisionReason,
  MediaPolicyInput,
  MediaPurpose,
  MediaRevokeCommand,
  MediaSignCommand,
  SignedAccessToken,
} from './types';

export type {
  CryptoSignaturePort,
  MediaAuditPort,
  MediaDecisionCachePort,
  MediaMetricsPort,
  ReplayProtectionPort,
  SignedAccessIssuer,
  SignedAccessStorePort,
} from './ports';

export { MediaAuthorizationService } from './authorization-service';
export { createMemoryDecisionCache, decisionCacheKey, newDecisionId, newGrantToken } from './cache';
export { createMemoryMediaAudit, createNoopMediaAudit } from './audit';
export { MediaPolicyResolver, type ResolvedMediaPolicy } from './policy-resolver';
export {
  createMemoryReplayProtection,
  createMemorySignedAccessStore,
  createStubCryptoSignature,
  SignedAccessService,
} from './signed-access';
export {
  assertMediaRole,
  parsePurpose,
  requireCorrelationId,
  requireIdempotencyKey,
  validateMediaContext,
} from './security';
