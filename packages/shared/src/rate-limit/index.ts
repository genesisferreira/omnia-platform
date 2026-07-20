/**
 * Rate limit Redis compartilhado (HOTFIX P04).
 *
 * Política de falha (documentada):
 * - Endpoints sensíveis (login, register, lead-capture): **fail-closed**
 *   quando Redis estiver indisponível em produção → negar (não permite bypass).
 * - Em desenvolvimento / testes sem REDIS_URL: fallback in-memory local,
 *   nunca adequado para multi-réplica.
 *
 * Chaves: `{namespace}:rl:{scope}:{subject}` — subject de e-mail/telefone é hash SHA-256.
 * Sem segredos na chave. TTL via PEXPIRE atômico (Lua).
 */
import { createHash } from 'node:crypto';

export type RateLimitDecision = {
  allowed: boolean;
  /** Motivo sanitizado para logs (sem PII). */
  reason: 'ok' | 'limited' | 'redis_unavailable' | 'memory_fallback';
  backend: 'redis' | 'memory';
};

export type RateLimitOptions = {
  /** Prefixo lógico (ex.: lead-capture, login, register). */
  scope: string;
  /** Identificadores brutos (IP, e-mail, WhatsApp). PII é hasheada quando marcada. */
  subjects: Array<{ value: string; hash?: boolean }>;
  max: number;
  windowMs: number;
  /**
   * fail-closed: nega se Redis falhar (padrão para auth/lead).
   * memory-fallback: usa Map local (somente dev/testes).
   */
  onRedisUnavailable?: 'fail-closed' | 'memory-fallback';
};

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();

type RedisLike = {
  eval: (script: string, numKeys: number, ...args: (string | number)[]) => Promise<unknown>;
  quit?: () => Promise<unknown>;
  status?: string;
};

let redisClient: RedisLike | null | undefined;
let redisInitAttempted = false;

const INCR_WITH_TTL_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export function rateLimitNamespace(): string {
  const env = process.env.APP_ENV || process.env.OMNIA_ENV || process.env.NODE_ENV || 'development';
  return `omnia:${env}:rl`;
}

export function hashRateLimitSubject(value: string): string {
  return createHash('sha256').update(value.normalize('NFKC').trim().toLowerCase()).digest('hex');
}

export function buildRateLimitKey(
  scope: string,
  subject: { value: string; hash?: boolean },
  namespace = rateLimitNamespace(),
): string {
  const token = subject.hash ? hashRateLimitSubject(subject.value) : subject.value.trim();
  return `${namespace}:${scope}:${token}`;
}

export function resetRateLimitMemoryForTests(): void {
  memoryBuckets.clear();
}

/** Injeta cliente Redis (ou null) — usado em testes. */
export function setRateLimitRedisClientForTests(client: RedisLike | null): void {
  redisClient = client;
  redisInitAttempted = true;
}

export function resetRateLimitRedisClientForTests(): void {
  redisClient = undefined;
  redisInitAttempted = false;
}

async function getRedisClient(): Promise<RedisLike | null> {
  if (redisInitAttempted) {
    return redisClient ?? null;
  }
  redisInitAttempted = true;

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    redisClient = null;
    return null;
  }

  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    client.on('error', () => {
      /* erros tratados na operação; evita unhandled */
    });
    await client.connect();
    redisClient = client as unknown as RedisLike;
    return redisClient;
  } catch {
    redisClient = null;
    return null;
  }
}

function allowMemory(keys: string[], max: number, windowMs: number): boolean {
  const now = Date.now();
  for (const key of keys) {
    const bucket = memoryBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
      continue;
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return false;
    }
  }
  return true;
}

async function allowRedis(keys: string[], max: number, windowMs: number): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) {
    throw new Error('redis_unavailable');
  }

  for (const key of keys) {
    const count = Number(await client.eval(INCR_WITH_TTL_LUA, 1, key, windowMs));
    if (!Number.isFinite(count) || count > max) {
      return false;
    }
  }
  return true;
}

/**
 * Avalia rate limit para um conjunto de subjects (todas as chaves devem passar).
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitDecision> {
  const { scope, subjects, max, windowMs } = options;

  const keys = subjects
    .filter((s) => s.value && s.value.trim().length > 0)
    .map((s) => buildRateLimitKey(scope, s));

  if (keys.length === 0) {
    return { allowed: true, reason: 'ok', backend: 'redis' };
  }

  const forceMemory = process.env.RATE_LIMIT_BACKEND === 'memory';

  if (forceMemory) {
    const allowed = allowMemory(keys, max, windowMs);
    return {
      allowed,
      reason: allowed ? 'ok' : 'limited',
      backend: 'memory',
    };
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  const unavailableMode =
    options.onRedisUnavailable ??
    (redisUrl && process.env.NODE_ENV === 'production' ? 'fail-closed' : 'memory-fallback');

  try {
    const allowed = await allowRedis(keys, max, windowMs);
    return {
      allowed,
      reason: allowed ? 'ok' : 'limited',
      backend: 'redis',
    };
  } catch {
    if (unavailableMode === 'memory-fallback') {
      const allowed = allowMemory(keys, max, windowMs);
      return {
        allowed,
        reason: allowed ? 'memory_fallback' : 'limited',
        backend: 'memory',
      };
    }
    return {
      allowed: false,
      reason: 'redis_unavailable',
      backend: 'redis',
    };
  }
}

/**
 * Resolve IP do cliente atrás de proxy.
 * Preferência: X-Real-IP (definido pelo reverse proxy).
 * X-Forwarded-For: usa apenas o primeiro hop.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp && realIp.length <= 64 && !realIp.includes(',')) {
    return realIp;
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim() || '';
    if (first && first.length <= 64) {
      return first;
    }
  }

  return 'unknown';
}
