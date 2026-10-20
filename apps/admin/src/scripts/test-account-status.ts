/* eslint-disable no-console -- test harness */
/**
 * Contratos de accountStatus blocked/pending/active (HOTFIX P04).
 */
import assert from 'node:assert/strict';

import {
  rejectBlockedBeforeLogin,
  rejectBlockedMe,
  rejectBlockedRefresh,
} from '../auth/account-status';

let passed = 0;

const test = (name: string, fn: () => void): void => {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
};

const fakeReq = {
  t: ((key: string) => key) as never,
  payload: { logger: { warn: () => undefined } },
};

test('beforeLogin rejeita blocked', () => {
  assert.throws(() =>
    rejectBlockedBeforeLogin({
      user: { id: 1, accountStatus: 'blocked' } as never,
      req: fakeReq as never,
      collection: {} as never,
      context: {},
    }),
  );
});

test('beforeLogin aceita pending e active', () => {
  for (const status of ['pending', 'active'] as const) {
    const user = { id: 2, accountStatus: status };
    const result = rejectBlockedBeforeLogin({
      user: user as never,
      req: fakeReq as never,
      collection: {} as never,
      context: {},
    });
    assert.equal((result as { accountStatus: string }).accountStatus, status);
  }
});

test('me hook anula usuário blocked', () => {
  const result = rejectBlockedMe({
    user: { id: 3, accountStatus: 'blocked' } as never,
    args: {} as never,
  }) as { user: null; exp: number } | undefined;
  assert.equal(result?.user, null);
});

test('me hook não interfere em pending/active', () => {
  assert.equal(
    rejectBlockedMe({
      user: { id: 4, accountStatus: 'pending' } as never,
      args: {} as never,
    }),
    undefined,
  );
  assert.equal(
    rejectBlockedMe({
      user: { id: 5, accountStatus: 'active' } as never,
      args: {} as never,
    }),
    undefined,
  );
});

test('refresh rejeita blocked', () => {
  assert.throws(() =>
    rejectBlockedRefresh({
      user: { id: 6, accountStatus: 'blocked' } as never,
      args: { req: fakeReq } as never,
    }),
  );
});

console.log(`\n${passed} testes OK (account-status)`);
