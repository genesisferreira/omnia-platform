/**
 * Portas de segurança — preparadas para Media Authorization / Signed URLs / Watermark.
 * Sem lógica definitiva (Épico C). Streaming CDN fora de escopo.
 */

export type MediaAuthorizeRequest = {
  assetId: string;
  omniaUserId: string;
  courseId: number;
  activityId?: number;
  purpose: 'view' | 'preview' | 'download';
};

export type MediaAuthorizeResult =
  | { ok: true; grantId: string; expiresAt: string }
  | { ok: false; code: 'NOT_IMPLEMENTED' | 'DENIED' | 'UNAVAILABLE'; reason: string };

/** Porta futura: autorização de mídia protegida. */
export type MediaAuthorizationPort = {
  authorize(request: MediaAuthorizeRequest): Promise<MediaAuthorizeResult>;
};

export type SignedUrlRequest = {
  assetId: string;
  grantId: string;
  ttlSeconds?: number;
};

export type SignedUrlResult =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; code: 'NOT_IMPLEMENTED' | 'EXPIRED' | 'DENIED'; reason: string };

/** Porta futura: URLs assinadas (CDN). */
export type SignedUrlPort = {
  issue(request: SignedUrlRequest): Promise<SignedUrlResult>;
};

export type WatermarkRequest = {
  omniaUserId: string;
  assetId: string;
  label?: string;
};

export type WatermarkResult =
  | { ok: true; watermarkId: string }
  | { ok: false; code: 'NOT_IMPLEMENTED'; reason: string };

/** Porta futura: watermark em viewer protegido. */
export type WatermarkPort = {
  apply(request: WatermarkRequest): Promise<WatermarkResult>;
};

export type ProtectedViewerRequest = {
  assetId: string;
  grantId: string;
  watermarkId?: string;
};

export type ProtectedViewerResult =
  | { ok: true; sessionId: string }
  | { ok: false; code: 'NOT_IMPLEMENTED' | 'DENIED'; reason: string };

/** Porta futura: sessão de viewer protegido (anti-download). */
export type ProtectedViewerPort = {
  open(request: ProtectedViewerRequest): Promise<ProtectedViewerResult>;
};

export type MaterialSecurityPorts = {
  mediaAuthorization: MediaAuthorizationPort;
  signedUrl: SignedUrlPort;
  watermark: WatermarkPort;
  protectedViewer: ProtectedViewerPort;
};

const NOT_IMPL = 'Media security port — reserved for future sprint (not implemented).';

/** Stubs seguros — nunca chamam Moodle nem geram URL real. */
export function createStubSecurityPorts(): MaterialSecurityPorts {
  return {
    mediaAuthorization: {
      async authorize() {
        return { ok: false, code: 'NOT_IMPLEMENTED', reason: NOT_IMPL };
      },
    },
    signedUrl: {
      async issue() {
        return { ok: false, code: 'NOT_IMPLEMENTED', reason: NOT_IMPL };
      },
    },
    watermark: {
      async apply() {
        return { ok: false, code: 'NOT_IMPLEMENTED', reason: NOT_IMPL };
      },
    },
    protectedViewer: {
      async open() {
        return { ok: false, code: 'NOT_IMPLEMENTED', reason: NOT_IMPL };
      },
    },
  };
}
