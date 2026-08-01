/**
 * Media Authorization — tipos imutáveis (Sprint 3.0 Épico B).
 * Modo controlado: decisões reais; sem Signed URL de produção / DRM / CDN.
 */

export type MediaPurpose = 'view' | 'preview' | 'download' | 'print' | 'share';

export type MediaDecisionReason =
  | 'GRANTED_CONTROLLED_MODE'
  | 'DENIED_DOWNLOAD_POLICY'
  | 'DENIED_PRINT_POLICY'
  | 'DENIED_SHARE_POLICY'
  | 'DENIED_VIEW_POLICY'
  | 'DENIED_ROLE'
  | 'DENIED_MISSING_CONTEXT'
  | 'DENIED_REVOKED'
  | 'DENIED_EXPIRED'
  | 'CACHE_HIT';

export type MediaCapabilities = Readonly<{
  canView: boolean;
  canDownload: boolean;
  canPrint: boolean;
  canShare: boolean;
}>;

export type MediaContext = Readonly<{
  omniaUserId: string;
  role: string;
  courseId: number;
  activityId?: number | null;
  materialId?: string | null;
  assetId: string;
  purpose: MediaPurpose;
  sessionId?: string | null;
  origin: 'omnia.web' | 'omnia.admin' | 'omnia.internal' | 'system';
  correlationId: string;
  idempotencyKey?: string | null;
}>;

export type MediaPolicyInput = Readonly<{
  downloadsAllowed: boolean;
  watermarkEnabled: boolean;
  mediaTtlSeconds: number;
  /** Overrides por material/curso (opcional). */
  materialDownloadsAllowed?: boolean | null;
  materialCanPrint?: boolean | null;
  materialCanShare?: boolean | null;
  forceDenyView?: boolean;
}>;

/** Decisão imutável — nunca mutar após criação. */
export type MediaDecision = Readonly<{
  decisionId: string;
  granted: boolean;
  capabilities: MediaCapabilities;
  expiresAt: string;
  reason: MediaDecisionReason;
  origin: MediaContext['origin'];
  correlationId: string;
  assetId: string;
  omniaUserId: string;
  courseId: number;
  purpose: MediaPurpose;
  policySource: 'global' | 'course' | 'material' | 'user' | 'controlled';
  watermarkRequired: boolean;
  controlledMode: true;
  latencyMs: number;
  cached?: boolean;
  grantToken?: string | null;
}>;

export type SignedAccessToken = Readonly<{
  tokenId: string;
  grantId: string;
  assetId: string;
  /** Placeholder — nunca URL real de CDN/S3 neste épico. */
  url: string;
  expiresAt: string;
  mode: 'controlled-mock';
  revoked: boolean;
}>;

export type MediaAuthorizeCommand = {
  context: MediaContext;
  policy: MediaPolicyInput;
};

export type MediaSignCommand = {
  decisionId: string;
  grantToken: string;
  assetId: string;
  omniaUserId: string;
  ttlSeconds?: number;
  correlationId: string;
};

export type MediaRevokeCommand = {
  tokenId?: string;
  grantId?: string;
  assetId?: string;
  omniaUserId: string;
  correlationId: string;
  reason?: string;
};
