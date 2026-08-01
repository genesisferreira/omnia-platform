import { randomUUID } from 'node:crypto';

import type {
  CryptoSignaturePort,
  ReplayProtectionPort,
  SignedAccessIssuer,
  SignedAccessStorePort,
} from './ports';
import type { MediaDecision, MediaRevokeCommand, MediaSignCommand, SignedAccessToken } from './types';

export function createMemorySignedAccessStore(): SignedAccessStorePort {
  const byId = new Map<string, SignedAccessToken>();
  return {
    async save(token) {
      byId.set(token.tokenId, token);
    },
    async get(tokenId) {
      return byId.get(tokenId) ?? null;
    },
    async revoke(tokenId) {
      const cur = byId.get(tokenId);
      if (!cur) return null;
      const next = Object.freeze({ ...cur, revoked: true });
      byId.set(tokenId, next);
      return next;
    },
    async revokeByGrant(grantId) {
      let n = 0;
      for (const [id, t] of byId) {
        if (t.grantId === grantId && !t.revoked) {
          byId.set(id, Object.freeze({ ...t, revoked: true }));
          n += 1;
        }
      }
      return n;
    },
  };
}

/** Assinatura stub — contrato preparado, sem crypto definitiva. */
export function createStubCryptoSignature(): CryptoSignaturePort {
  return {
    async sign(payload) {
      return `stub-sig:${payload.length}`;
    },
    async verify(payload, signature) {
      return signature === `stub-sig:${payload.length}`;
    },
  };
}

export function createMemoryReplayProtection(): ReplayProtectionPort {
  const seen = new Map<string, number>();
  return {
    async seen(jti) {
      const exp = seen.get(jti);
      if (exp == null) return false;
      if (Date.now() > exp) {
        seen.delete(jti);
        return false;
      }
      return true;
    },
    async mark(jti, ttlSeconds) {
      seen.set(jti, Date.now() + ttlSeconds * 1000);
    },
  };
}

/**
 * Signed Access controlado: token mock, URL placeholder.
 * Não integra S3/Azure/MinIO/CDN.
 */
export class SignedAccessService implements SignedAccessIssuer {
  constructor(
    private readonly store: SignedAccessStorePort,
    private readonly crypto: CryptoSignaturePort = createStubCryptoSignature(),
  ) {}

  async issue(command: MediaSignCommand, decision: MediaDecision): Promise<SignedAccessToken> {
    if (!decision.granted || !decision.grantToken) {
      throw Object.assign(new Error('SIGN_DENIED'), { code: 'SIGN_DENIED' });
    }
    if (decision.grantToken !== command.grantToken) {
      throw Object.assign(new Error('GRANT_MISMATCH'), { code: 'GRANT_MISMATCH' });
    }

    const ttl = Math.max(30, command.ttlSeconds ?? 300);
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    const tokenId = randomUUID();
    const payload = `${tokenId}|${command.assetId}|${expiresAt}`;
    const sig = await this.crypto.sign(payload);

    const token: SignedAccessToken = Object.freeze({
      tokenId,
      grantId: command.decisionId,
      assetId: command.assetId,
      url: `controlled://media/${command.assetId}?t=${tokenId}&sig=${encodeURIComponent(sig)}`,
      expiresAt,
      mode: 'controlled-mock',
      revoked: false,
    });

    await this.store.save(token);
    return token;
  }

  async renew(tokenId: string, ttlSeconds: number): Promise<SignedAccessToken | null> {
    const cur = await this.store.get(tokenId);
    if (!cur || cur.revoked) return null;
    if (new Date(cur.expiresAt).getTime() < Date.now()) return null;
    const next: SignedAccessToken = Object.freeze({
      ...cur,
      expiresAt: new Date(Date.now() + Math.max(30, ttlSeconds) * 1000).toISOString(),
    });
    await this.store.save(next);
    return next;
  }

  async revoke(command: MediaRevokeCommand): Promise<{ revoked: number }> {
    if (command.tokenId) {
      const t = await this.store.revoke(command.tokenId);
      return { revoked: t ? 1 : 0 };
    }
    if (command.grantId) {
      const n = await this.store.revokeByGrant(command.grantId);
      return { revoked: n };
    }
    return { revoked: 0 };
  }
}
