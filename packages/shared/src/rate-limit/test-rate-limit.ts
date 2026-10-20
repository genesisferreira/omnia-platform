/* eslint-disable no-console -- test harness */
/**
 * Testes unitários do rate limit Redis (HOTFIX P04).
 * Usa backend memory + mock Redis para determinismo.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  buildRateLimitKey,
  checkRateLimit,
  hashRateLimitSubject,
  resetRateLimitMemoryForTests,
  resetRateLimitRedisClientForTests,
  setRateLimitRedisClientForTests,
} from '@omnia/shared/rate-limit';

let passed = 0;

const test = async (name: string, fn: () => void | Promise<void>): Promise<void> => {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

const run = async (): Promise<void> => {
  process.env.RATE_LIMIT_BACKEND = 'memory';
  resetRateLimitMemoryForTests();
  resetRateLimitRedisClientForTests();

  await test('hash de e-mail é estável e sem plaintext na chave', () => {
    const hash = hashRateLimitSubject('Gen@Example.COM');
    assert.equal(hash, createHash('sha256').update('gen@example.com').digest('hex'));
    const key = buildRateLimitKey(
      'login',
      { value: 'Gen@Example.COM', hash: true },
      'omnia:test:rl',
    );
    assert.match(key, /^omnia:test:rl:login:[a-f0-9]{64}$/);
    assert.equal(key.includes('@'), false);
  });

  await test('memory backend bloqueia após max', async () => {
    resetRateLimitMemoryForTests();
    const subjects = [{ value: 'ip:10.0.0.1' }];
    for (let i = 0; i < 3; i += 1) {
      const d = await checkRateLimit({
        scope: 'unit',
        subjects,
        max: 3,
        windowMs: 60_000,
      });
      assert.equal(d.allowed, true);
      assert.equal(d.backend, 'memory');
    }
    const blocked = await checkRateLimit({
      scope: 'unit',
      subjects,
      max: 3,
      windowMs: 60_000,
    });
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.reason, 'limited');
  });

  await test('mock Redis INCR atômico respeita limite e TTL', async () => {
    delete process.env.RATE_LIMIT_BACKEND;
    resetRateLimitMemoryForTests();

    const store = new Map<string, { count: number; ttl?: number }>();
    setRateLimitRedisClientForTests({
      eval: async (_script, _n, key, windowMs) => {
        const k = String(key);
        const current = store.get(k);
        if (!current) {
          store.set(k, { count: 1, ttl: Number(windowMs) });
          return 1;
        }
        current.count += 1;
        return current.count;
      },
    });

    const subjects = [{ value: 'ip:203.0.113.9' }];
    for (let i = 0; i < 2; i += 1) {
      const d = await checkRateLimit({
        scope: 'redis-mock',
        subjects,
        max: 2,
        windowMs: 15_000,
        onRedisUnavailable: 'fail-closed',
      });
      assert.equal(d.allowed, true);
      assert.equal(d.backend, 'redis');
    }
    const blocked = await checkRateLimit({
      scope: 'redis-mock',
      subjects,
      max: 2,
      windowMs: 15_000,
      onRedisUnavailable: 'fail-closed',
    });
    assert.equal(blocked.allowed, false);
    assert.equal(store.get(buildRateLimitKey('redis-mock', subjects[0]!))?.ttl, 15_000);

    resetRateLimitRedisClientForTests();
    process.env.RATE_LIMIT_BACKEND = 'memory';
  });

  await test('fail-closed quando Redis indisponível', async () => {
    delete process.env.RATE_LIMIT_BACKEND;
    setRateLimitRedisClientForTests({
      eval: async () => {
        throw new Error('down');
      },
    });

    const d = await checkRateLimit({
      scope: 'auth',
      subjects: [{ value: 'ip:1.1.1.1' }],
      max: 5,
      windowMs: 60_000,
      onRedisUnavailable: 'fail-closed',
    });
    assert.equal(d.allowed, false);
    assert.equal(d.reason, 'redis_unavailable');

    resetRateLimitRedisClientForTests();
    process.env.RATE_LIMIT_BACKEND = 'memory';
  });

  await test('peek não incrementa e respeita max', async () => {
    const { peekRateLimit } = await import('@omnia/shared/rate-limit');
    process.env.RATE_LIMIT_BACKEND = 'memory';
    resetRateLimitMemoryForTests();
    const subjects = [{ value: 'ip:peek-1' }];
    const open = await peekRateLimit({
      scope: 'peek',
      subjects,
      max: 2,
      windowMs: 60_000,
    });
    assert.equal(open.allowed, true);
    await checkRateLimit({ scope: 'peek', subjects, max: 2, windowMs: 60_000 });
    await checkRateLimit({ scope: 'peek', subjects, max: 2, windowMs: 60_000 });
    const blocked = await peekRateLimit({
      scope: 'peek',
      subjects,
      max: 2,
      windowMs: 60_000,
    });
    assert.equal(blocked.allowed, false);
    assert.ok((blocked.retryAfterSeconds ?? 0) >= 1);
  });

  await test('R6 public chat: human session budget stays open while abuse IP trips', async () => {
    resetRateLimitMemoryForTests();
    const human = { value: `anon:session-${Date.now()}`, hash: true as const };
    for (let i = 0; i < 50; i++) {
      const d = await checkRateLimit({
        scope: 'ai-public-chat-human',
        subjects: [human],
        max: 120,
        windowMs: 15 * 60 * 1000,
      });
      assert.equal(d.allowed, true);
    }
    let abuseBlocked = false;
    for (let i = 0; i < 70; i++) {
      const d = await checkRateLimit({
        scope: 'ai-public-chat-abuse',
        subjects: [{ value: 'ip:203.0.113.50' }],
        max: 60,
        windowMs: 5 * 60 * 1000,
      });
      if (!d.allowed) {
        abuseBlocked = true;
        break;
      }
    }
    assert.equal(abuseBlocked, true);
  });

  console.log(`\n${passed} testes OK (rate-limit)`);
};

void run();
