import { createHash, randomUUID } from 'node:crypto';

import type { LmsProfileRole, LmsSessionRecord } from '@omnia/shared/lms';

import { LmsConnectorError } from '../errors';
import { lmsLog } from '../observability/log';
import { recordSessionCreate, recordSessionRevocation } from '../observability/metrics';
import type { LmsResolvedPolicy } from '../policy/resolve-lms-policy';

export type RedisLike = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ...args: (string | number)[]) => Promise<unknown>;
  del: (...keys: string[]) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
  sadd: (key: string, ...members: string[]) => Promise<number>;
  srem: (key: string, ...members: string[]) => Promise<number>;
  smembers: (key: string) => Promise<string[]>;
  lpush?: (key: string, ...values: string[]) => Promise<number>;
  rpop?: (key: string) => Promise<string | null>;
  llen?: (key: string) => Promise<number>;
  eval: (script: string, numKeys: number, ...args: (string | number)[]) => Promise<unknown>;
  ping: () => Promise<string>;
  status?: string;
  quit?: () => Promise<unknown>;
};

export type SessionManagerOptions = {
  redis: RedisLike | null;
  appEnv: string;
  /** Fallback in-memory (apenas testes/DEV sem Redis). */
  allowMemoryFallback?: boolean;
};

export type CreateSessionInput = {
  userId: string;
  role: LmsProfileRole;
  deviceId: string;
  sessionFamilyId?: string;
  userAgent?: string;
  ip?: string;
  policy: LmsResolvedPolicy;
};

export type CreateSessionResult = {
  session: LmsSessionRecord;
  revokedSessionIds: string[];
};

const CLAIM_LUA = `
local indexKey = KEYS[1]
local sessionKeyPrefix = ARGV[1]
local newSessionId = ARGV[2]
local newSessionJson = ARGV[3]
local maxSessions = tonumber(ARGV[4])
local ttlSeconds = tonumber(ARGV[5])
local nowIso = ARGV[6]
local revokeOldest = ARGV[7] == '1'

redis.call('SADD', indexKey, newSessionId)
redis.call('SET', sessionKeyPrefix .. newSessionId, newSessionJson, 'EX', ttlSeconds)

local members = redis.call('SMEMBERS', indexKey)
local active = {}
local revoked = {}

for _, sid in ipairs(members) do
  local raw = redis.call('GET', sessionKeyPrefix .. sid)
  if not raw then
    redis.call('SREM', indexKey, sid)
  else
    local revokedAt = string.match(raw, '"revokedAt":%s*"(.-)"')
    local expiresAt = string.match(raw, '"expiresAt":%s*"(.-)"')
    local isRevoked = revokedAt and revokedAt ~= '' and revokedAt ~= 'null'
    local expired = false
    if expiresAt then
      -- ISO lexicographic compare works for UTC Z timestamps
      expired = expiresAt < nowIso
    end
    if isRevoked or expired then
      redis.call('SREM', indexKey, sid)
      if sid ~= newSessionId then
        redis.call('DEL', sessionKeyPrefix .. sid)
      end
    else
      table.insert(active, sid)
    end
  end
end

if maxSessions > 0 and #active > maxSessions and revokeOldest then
  -- Sort by createdAt ascending using stored JSON
  table.sort(active, function(a, b)
    local ra = redis.call('GET', sessionKeyPrefix .. a) or ''
    local rb = redis.call('GET', sessionKeyPrefix .. b) or ''
    local ca = string.match(ra, '"createdAt":%s*"(.-)"') or ''
    local cb = string.match(rb, '"createdAt":%s*"(.-)"') or ''
    return ca < cb
  end)
  while #active > maxSessions do
    local victim = table.remove(active, 1)
    if victim ~= newSessionId then
      local raw = redis.call('GET', sessionKeyPrefix .. victim)
      if raw then
        local updated = string.gsub(raw, '"revokedAt":%s*null', '"revokedAt":"' .. nowIso .. '"', 1)
        updated = string.gsub(updated, '"revokeReason":%s*null', '"revokeReason":"SESSION_LIMIT"', 1)
        updated = string.gsub(updated, '"replacementSessionId":%s*null', '"replacementSessionId":"' .. newSessionId .. '"', 1)
        redis.call('SET', sessionKeyPrefix .. victim, updated, 'EX', ttlSeconds)
        table.insert(revoked, victim)
      end
      redis.call('SREM', indexKey, victim)
    else
      break
    end
  end
end

return { newSessionId, table.concat(revoked, ',') }
`;

function sanitizeUserAgent(ua: string | undefined): string {
  if (!ua) return 'unknown';
  return ua.replace(/[\r\n\t]/g, ' ').slice(0, 180);
}

function normalizeIp(ip: string | undefined): string {
  if (!ip) return '0.0.0.0';
  return ip.split(',')[0]?.trim().slice(0, 64) || '0.0.0.0';
}

export function lmsSessionNamespace(appEnv: string): string {
  return `omnia:lms:sessions:${appEnv}`;
}

export function sessionKey(ns: string, sessionId: string): string {
  return `${ns}:s:${sessionId}`;
}

export function userIndexKey(ns: string, userId: string): string {
  return `${ns}:u:${userId}`;
}

export function familyKey(ns: string, familyId: string): string {
  return `${ns}:f:${familyId}`;
}

type MemoryStore = {
  sessions: Map<string, LmsSessionRecord>;
  byUser: Map<string, Set<string>>;
};

/**
 * Session Manager Omnia LMS.
 * Redis Platform com namespace dedicado — não usa Redis do Moodle.
 */
export class LmsSessionManager {
  private readonly redis: RedisLike | null;
  private readonly ns: string;
  private readonly memory: MemoryStore | null;

  constructor(options: SessionManagerOptions) {
    this.redis = options.redis;
    this.ns = lmsSessionNamespace(options.appEnv);
    this.memory =
      !options.redis && options.allowMemoryFallback
        ? { sessions: new Map(), byUser: new Map() }
        : null;
  }

  get namespace(): string {
    return this.ns;
  }

  async ping(): Promise<boolean> {
    if (this.redis) {
      try {
        const pong = await this.redis.ping();
        return pong === 'PONG' || pong === 'pong';
      } catch {
        return false;
      }
    }
    return this.memory != null;
  }

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    if (!input.policy.sessionPolicyEnabled) {
      // Policy off: ainda cria sessão única sem limite agressivo.
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.policy.sessionTtlSeconds * 1000);
    const sessionFamilyId = input.sessionFamilyId || randomUUID();
    const sessionId = randomUUID();

    // Múltiplas abas: mesma familyId reutiliza sessão ativa da família.
    const existingFamily = await this.findActiveByFamily(input.userId, sessionFamilyId);
    if (existingFamily) {
      existingFamily.lastSeenAt = now.toISOString();
      await this.saveSession(existingFamily, input.policy.sessionTtlSeconds);
      recordSessionCreate(true);
      return { session: existingFamily, revokedSessionIds: [] };
    }

    const session: LmsSessionRecord = {
      sessionId,
      sessionFamilyId,
      userId: input.userId,
      role: input.role,
      deviceId: input.deviceId || hashDeviceFallback(input.userAgent, input.ip),
      userAgent: sanitizeUserAgent(input.userAgent),
      ip: normalizeIp(input.ip),
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      revokedAt: null,
      revokeReason: null,
      replacementSessionId: null,
    };

    if (this.redis) {
      const revoked = await this.claimWithRedis(session, input.policy);
      for (const id of revoked) recordSessionRevocation();
      lmsLog('info', 'lms.session.create', {
        userId: input.userId,
        role: input.role,
        sessionId,
        revokedCount: revoked.length,
      });
      recordSessionCreate(true);
      return { session, revokedSessionIds: revoked };
    }

    if (!this.memory) {
      recordSessionCreate(false);
      throw new LmsConnectorError('SESSION_STORE_UNAVAILABLE', 'LMS session store unavailable', {
        httpStatus: 503,
      });
    }

    const revoked = this.claimWithMemory(session, input.policy);
    for (const id of revoked) recordSessionRevocation();
    recordSessionCreate(true);
    return { session, revokedSessionIds: revoked };
  }

  async heartbeat(sessionId: string, userId: string): Promise<LmsSessionRecord> {
    const session = await this.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new LmsConnectorError('UNAUTHORIZED', 'Session not found', { httpStatus: 401 });
    }
    this.assertActive(session);
    session.lastSeenAt = new Date().toISOString();
    const ttl = Math.max(60, Math.ceil((Date.parse(session.expiresAt) - Date.now()) / 1000));
    await this.saveSession(session, ttl);
    return session;
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session || session.userId !== userId) return;
    await this.revokeSession(sessionId, 'LOGOUT');
  }

  async revokeSession(
    sessionId: string,
    reason: string,
    replacementSessionId: string | null = null,
  ): Promise<LmsSessionRecord | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    if (session.revokedAt) return session;
    session.revokedAt = new Date().toISOString();
    session.revokeReason = reason;
    session.replacementSessionId = replacementSessionId;
    const ttl = Math.max(60, Math.ceil((Date.parse(session.expiresAt) - Date.now()) / 1000));
    await this.saveSession(session, ttl);
    if (this.redis) {
      await this.redis.srem(userIndexKey(this.ns, session.userId), sessionId);
    } else if (this.memory) {
      this.memory.byUser.get(session.userId)?.delete(sessionId);
    }
    recordSessionRevocation();
    lmsLog('info', 'lms.session.revoke', {
      sessionId,
      userId: session.userId,
      reason,
    });
    return session;
  }

  async revokeAllForUser(userId: string, reason = 'REVOKE_ALL'): Promise<number> {
    const active = await this.listActiveSessions(userId);
    for (const s of active) {
      await this.revokeSession(s.sessionId, reason);
    }
    return active.length;
  }

  async getSession(sessionId: string): Promise<LmsSessionRecord | null> {
    if (this.redis) {
      const raw = await this.redis.get(sessionKey(this.ns, sessionId));
      if (!raw) return null;
      return JSON.parse(raw) as LmsSessionRecord;
    }
    return this.memory?.sessions.get(sessionId) ?? null;
  }

  async listActiveSessions(userId: string): Promise<LmsSessionRecord[]> {
    const ids = await this.listSessionIds(userId);
    const out: LmsSessionRecord[] = [];
    for (const id of ids) {
      const s = await this.getSession(id);
      if (!s) continue;
      if (this.isActive(s)) out.push(s);
    }
    return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  assertActive(session: LmsSessionRecord): void {
    if (session.revokedAt) {
      throw new LmsConnectorError('SESSION_REVOKED', 'Session has been revoked', {
        httpStatus: 401,
      });
    }
    if (Date.parse(session.expiresAt) <= Date.now()) {
      throw new LmsConnectorError('SESSION_EXPIRED', 'Session has expired', {
        httpStatus: 401,
      });
    }
  }

  private isActive(session: LmsSessionRecord): boolean {
    return !session.revokedAt && Date.parse(session.expiresAt) > Date.now();
  }

  private async findActiveByFamily(
    userId: string,
    familyId: string,
  ): Promise<LmsSessionRecord | null> {
    const active = await this.listActiveSessions(userId);
    return active.find((s) => s.sessionFamilyId === familyId) ?? null;
  }

  private async listSessionIds(userId: string): Promise<string[]> {
    if (this.redis) {
      return this.redis.smembers(userIndexKey(this.ns, userId));
    }
    return [...(this.memory?.byUser.get(userId) ?? new Set())];
  }

  private async saveSession(session: LmsSessionRecord, ttlSeconds: number): Promise<void> {
    if (this.redis) {
      await this.redis.set(
        sessionKey(this.ns, session.sessionId),
        JSON.stringify(session),
        'EX',
        ttlSeconds,
      );
      await this.redis.sadd(userIndexKey(this.ns, session.userId), session.sessionId);
      await this.redis.expire(userIndexKey(this.ns, session.userId), ttlSeconds);
      return;
    }
    if (this.memory) {
      this.memory.sessions.set(session.sessionId, session);
      const set = this.memory.byUser.get(session.userId) ?? new Set();
      set.add(session.sessionId);
      this.memory.byUser.set(session.userId, set);
    }
  }

  private async claimWithRedis(
    session: LmsSessionRecord,
    policy: LmsResolvedPolicy,
  ): Promise<string[]> {
    if (!this.redis) return [];
    const result = await this.redis.eval(
      CLAIM_LUA,
      1,
      userIndexKey(this.ns, session.userId),
      `${this.ns}:s:`,
      session.sessionId,
      JSON.stringify(session),
      policy.maxSessions,
      policy.sessionTtlSeconds,
      new Date().toISOString(),
      policy.revokeOldestOnExceed ? '1' : '0',
    );
    if (Array.isArray(result) && typeof result[1] === 'string' && result[1]) {
      return result[1].split(',').filter(Boolean);
    }
    return [];
  }

  private claimWithMemory(session: LmsSessionRecord, policy: LmsResolvedPolicy): string[] {
    if (!this.memory) return [];
    this.memory.sessions.set(session.sessionId, session);
    const set = this.memory.byUser.get(session.userId) ?? new Set();
    set.add(session.sessionId);
    this.memory.byUser.set(session.userId, set);

    const active = [...set]
      .map((id) => this.memory!.sessions.get(id))
      .filter((s): s is LmsSessionRecord => !!s && this.isActive(s))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const revoked: string[] = [];
    if (policy.revokeOldestOnExceed) {
      while (active.length > policy.maxSessions) {
        const victim = active.shift();
        if (!victim || victim.sessionId === session.sessionId) break;
        victim.revokedAt = new Date().toISOString();
        victim.revokeReason = 'SESSION_LIMIT';
        victim.replacementSessionId = session.sessionId;
        this.memory.sessions.set(victim.sessionId, victim);
        set.delete(victim.sessionId);
        revoked.push(victim.sessionId);
      }
    }
    return revoked;
  }
}

function hashDeviceFallback(ua?: string, ip?: string): string {
  return createHash('sha256')
    .update(`${sanitizeUserAgent(ua)}|${normalizeIp(ip)}`)
    .digest('hex')
    .slice(0, 32);
}

export async function createRedisFromUrl(url: string): Promise<RedisLike> {
  const { default: Redis } = await import('ioredis');
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 2000,
  });
  client.on('error', () => {
    /* handled per operation */
  });
  await client.connect();
  return client as unknown as RedisLike;
}
