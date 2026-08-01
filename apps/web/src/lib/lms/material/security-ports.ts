/**
 * Portas de segurança — Media Authorization (Sprint 3.0 Épico B).
 * Modo controlado: decisões reais via BFF; sem Signed URL de produção / DRM.
 */

export type MediaAuthorizeRequest = {
  assetId: string;
  omniaUserId?: string;
  courseId: number;
  activityId?: number;
  materialId?: string;
  purpose: 'view' | 'preview' | 'download' | 'print' | 'share';
};

export type MediaAuthorizeResult =
  | {
      ok: true;
      grantId: string;
      expiresAt: string;
      decisionId: string;
      grantToken: string | null;
      capabilities: {
        canView: boolean;
        canDownload: boolean;
        canPrint: boolean;
        canShare: boolean;
      };
      reason: string;
      controlledMode: true;
    }
  | {
      ok: false;
      code: 'DENIED' | 'UNAVAILABLE' | 'UNAUTHORIZED' | 'NOT_IMPLEMENTED';
      reason: string;
    };

/** Porta: autorização de mídia protegida. */
export type MediaAuthorizationPort = {
  authorize(request: MediaAuthorizeRequest): Promise<MediaAuthorizeResult>;
};

export type SignedUrlRequest = {
  assetId: string;
  grantId: string;
  grantToken?: string;
  decisionId?: string;
  ttlSeconds?: number;
};

export type SignedUrlResult =
  | { ok: true; url: string; expiresAt: string; mode: 'controlled-mock' }
  | { ok: false; code: 'NOT_IMPLEMENTED' | 'EXPIRED' | 'DENIED' | 'UNAVAILABLE'; reason: string };

/** Porta: URLs assinadas (contrato; mock controlado neste épico). */
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
  | { ok: false; code: 'NOT_IMPLEMENTED' | 'SKIPPED'; reason: string };

/** Porta futura: watermark visual (não ativado neste épico). */
export type WatermarkPort = {
  apply(request: WatermarkRequest): Promise<WatermarkResult>;
};

export type ProtectedViewerRequest = {
  assetId: string;
  grantId: string;
  watermarkId?: string;
  decisionGranted: boolean;
};

export type ProtectedViewerResult =
  | { ok: true; sessionId: string; delivery: 'unchanged' }
  | { ok: false; code: 'DENIED' | 'UNAVAILABLE'; reason: string };

/** Porta: sessão de viewer protegido — neste épico só gate de decisão. */
export type ProtectedViewerPort = {
  open(request: ProtectedViewerRequest): Promise<ProtectedViewerResult>;
};

export type MaterialSecurityPorts = {
  mediaAuthorization: MediaAuthorizationPort;
  signedUrl: SignedUrlPort;
  watermark: WatermarkPort;
  protectedViewer: ProtectedViewerPort;
};

function idemKey(): string {
  return `media_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Ports controlados via BFF (`/api/lms/internal/media/*`).
 * Entrega de conteúdo permanece a atual (sem CDN/signed real).
 */
export function createControlledSecurityPorts(): MaterialSecurityPorts {
  return {
    mediaAuthorization: {
      async authorize(request) {
        try {
          const res = await fetch('/api/lms/internal/media/authorize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'Idempotency-Key': idemKey(),
            },
            body: JSON.stringify({
              assetId: request.assetId,
              courseId: request.courseId,
              activityId: request.activityId,
              materialId: request.materialId,
              purpose: request.purpose,
            }),
            cache: 'no-store',
          });
          const data = (await res.json().catch(() => null)) as {
            ok?: boolean;
            decision?: {
              granted?: boolean;
              decisionId?: string;
              grantToken?: string | null;
              expiresAt?: string;
              reason?: string;
              capabilities?: {
                canView: boolean;
                canDownload: boolean;
                canPrint: boolean;
                canShare: boolean;
              };
              controlledMode?: boolean;
            };
            error?: { code?: string; message?: string };
          } | null;

          if (res.status === 401) {
            return { ok: false, code: 'UNAUTHORIZED', reason: 'Authentication required' };
          }
          if (!res.ok || !data?.decision) {
            return {
              ok: false,
              code: 'UNAVAILABLE',
              reason: data?.error?.message || 'Media authorization unavailable',
            };
          }
          const d = data.decision;
          if (!d.granted) {
            return {
              ok: false,
              code: 'DENIED',
              reason: d.reason || 'DENIED',
            };
          }
          return {
            ok: true,
            grantId: d.decisionId || 'unknown',
            decisionId: d.decisionId || 'unknown',
            grantToken: d.grantToken ?? null,
            expiresAt: d.expiresAt || new Date(Date.now() + 300_000).toISOString(),
            capabilities: d.capabilities || {
              canView: true,
              canDownload: false,
              canPrint: false,
              canShare: false,
            },
            reason: d.reason || 'GRANTED_CONTROLLED_MODE',
            controlledMode: true,
          };
        } catch {
          return { ok: false, code: 'UNAVAILABLE', reason: 'Media authorization network error' };
        }
      },
    },
    signedUrl: {
      async issue(request) {
        if (!request.decisionId || !request.grantToken) {
          return {
            ok: false,
            code: 'DENIED',
            reason: 'grant required for controlled sign',
          };
        }
        try {
          const res = await fetch('/api/lms/internal/media/sign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              decisionId: request.decisionId,
              grantToken: request.grantToken,
              assetId: request.assetId,
              ttlSeconds: request.ttlSeconds,
            }),
            cache: 'no-store',
          });
          const data = (await res.json().catch(() => null)) as {
            ok?: boolean;
            token?: { url?: string; expiresAt?: string; mode?: string };
          } | null;
          if (!res.ok || !data?.token?.url) {
            return { ok: false, code: 'UNAVAILABLE', reason: 'Sign unavailable' };
          }
          return {
            ok: true,
            url: data.token.url,
            expiresAt: data.token.expiresAt || new Date().toISOString(),
            mode: 'controlled-mock',
          };
        } catch {
          return { ok: false, code: 'UNAVAILABLE', reason: 'Sign network error' };
        }
      },
    },
    watermark: {
      async apply() {
        return {
          ok: false,
          code: 'NOT_IMPLEMENTED',
          reason: 'Visual watermark deferred (Epic B controlled mode)',
        };
      },
    },
    protectedViewer: {
      async open(request) {
        if (!request.decisionGranted) {
          return { ok: false, code: 'DENIED', reason: 'Authorization denied' };
        }
        return {
          ok: true,
          sessionId: `pvs_${request.grantId}`,
          delivery: 'unchanged',
        };
      },
    },
  };
}

/** Stubs isolados para testes unitários — sem fetch. */
export function createStubSecurityPorts(): MaterialSecurityPorts {
  const NOT_IMPL = 'Media security port — stub for unit tests.';
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
        return { ok: false, code: 'DENIED', reason: NOT_IMPL };
      },
    },
  };
}
