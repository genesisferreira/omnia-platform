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
  /** Segundos até liberar (quando limited). */
  retryAfterSeconds?: number;
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
  get?: (key: string) => Promise<string | null>;
  pttl?: (key: string) => Promise<number>;
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

type AllowResult = { allowed: boolean; retryAfterSeconds?: number };

function allowMemory(keys: string[], max: number, windowMs: number): AllowResult {
  const now = Date.now();
  let retryAfterSeconds: number | undefined;
  for (const key of keys) {
    const bucket = memoryBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
      continue;
    }
    bucket.count += 1;
    if (bucket.count > max) {
      retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
        retryAfterSeconds ?? 0,
      );
    }
  }
  if (retryAfterSeconds != null) {
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true };
}

async function allowRedis(keys: string[], max: number, windowMs: number): Promise<AllowResult> {
  const client = await getRedisClient();
  if (!client) {
    throw new Error('redis_unavailable');
  }

  let retryAfterSeconds: number | undefined;
  for (const key of keys) {
    const count = Number(await client.eval(INCR_WITH_TTL_LUA, 1, key, windowMs));
    if (!Number.isFinite(count) || count > max) {
      try {
        const pttl = client.pttl ? Number(await client.pttl(key)) : windowMs;
        if (Number.isFinite(pttl) && pttl > 0) {
          retryAfterSeconds = Math.max(1, Math.ceil(pttl / 1000), retryAfterSeconds ?? 0);
        } else {
          retryAfterSeconds = Math.max(1, Math.ceil(windowMs / 1000), retryAfterSeconds ?? 0);
        }
      } catch {
        retryAfterSeconds = Math.max(1, Math.ceil(windowMs / 1000), retryAfterSeconds ?? 0);
      }
    }
  }
  if (retryAfterSeconds != null) {
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true };
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
    const result = allowMemory(keys, max, windowMs);
    return {
      allowed: result.allowed,
      reason: result.allowed ? 'ok' : 'limited',
      backend: 'memory',
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  // APP_ENV/OMNIA_ENV=staging deve usar memory-fallback mesmo com NODE_ENV=production (imagem Next).
  const deployEnv = (process.env.APP_ENV || process.env.OMNIA_ENV || '').toLowerCase();
  const isStrictProd =
    deployEnv === 'production' || (!deployEnv && process.env.NODE_ENV === 'production');
  const unavailableMode =
    options.onRedisUnavailable ?? (redisUrl && isStrictProd ? 'fail-closed' : 'memory-fallback');

  try {
    const result = await allowRedis(keys, max, windowMs);
    return {
      allowed: result.allowed,
      reason: result.allowed ? 'ok' : 'limited',
      backend: 'redis',
      retryAfterSeconds: result.retryAfterSeconds,
    };
  } catch {
    if (unavailableMode === 'memory-fallback') {
      const result = allowMemory(keys, max, windowMs);
      return {
        allowed: result.allowed,
        reason: result.allowed ? 'memory_fallback' : 'limited',
        backend: 'memory',
        retryAfterSeconds: result.retryAfterSeconds,
      };
    }
    return {
      allowed: false,
      reason: 'redis_unavailable',
      backend: 'redis',
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }
}

function peekMemory(keys: string[], max: number): AllowResult {
  const now = Date.now();
  let retryAfterSeconds: number | undefined;
  for (const key of keys) {
    const bucket = memoryBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      continue;
    }
    if (bucket.count >= max) {
      retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
        retryAfterSeconds ?? 0,
      );
    }
  }
  if (retryAfterSeconds != null) {
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true };
}

/**
 * Lê contadores sem incrementar — para pré-checagem antes de criar recurso.
 */
export async function peekRateLimit(options: RateLimitOptions): Promise<RateLimitDecision> {
  const { scope, subjects, max, windowMs } = options;
  const keys = subjects
    .filter((s) => s.value && s.value.trim().length > 0)
    .map((s) => buildRateLimitKey(scope, s));

  if (keys.length === 0) {
    return { allowed: true, reason: 'ok', backend: 'redis' };
  }

  const forceMemory = process.env.RATE_LIMIT_BACKEND === 'memory';
  if (forceMemory) {
    const result = peekMemory(keys, max);
    return {
      allowed: result.allowed,
      reason: result.allowed ? 'ok' : 'limited',
      backend: 'memory',
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }

  const deployEnv = (process.env.APP_ENV || process.env.OMNIA_ENV || '').toLowerCase();
  const isStrictProd =
    deployEnv === 'production' || (!deployEnv && process.env.NODE_ENV === 'production');
  const unavailableMode =
    options.onRedisUnavailable ??
    (process.env.REDIS_URL && isStrictProd ? 'fail-closed' : 'memory-fallback');

  try {
    const client = await getRedisClient();
    if (!client) {
      throw new Error('redis_unavailable');
    }
    let retryAfterSeconds: number | undefined;
    for (const key of keys) {
      if (!client.get) {
        throw new Error('redis_unavailable');
      }
      const raw = await client.get(key);
      const count = Number(raw ?? 0);
      if (Number.isFinite(count) && count >= max) {
        const pttl = client.pttl ? Number(await client.pttl(key)) : windowMs;
        retryAfterSeconds = Math.max(
          1,
          Math.ceil((pttl > 0 ? pttl : windowMs) / 1000),
          retryAfterSeconds ?? 0,
        );
      }
    }
    if (retryAfterSeconds != null) {
      return {
        allowed: false,
        reason: 'limited',
        backend: 'redis',
        retryAfterSeconds,
      };
    }
    return { allowed: true, reason: 'ok', backend: 'redis' };
  } catch {
    if (unavailableMode === 'memory-fallback') {
      const result = peekMemory(keys, max);
      return {
        allowed: result.allowed,
        reason: result.allowed ? 'memory_fallback' : 'limited',
        backend: 'memory',
        retryAfterSeconds: result.retryAfterSeconds,
      };
    }
    return {
      allowed: false,
      reason: 'redis_unavailable',
      backend: 'redis',
      retryAfterSeconds: Math.ceil(windowMs / 1000),
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
