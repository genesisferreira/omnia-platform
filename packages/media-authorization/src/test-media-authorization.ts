import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MediaAuthorizationService } from './authorization-service';
import { createMemoryMediaAudit } from './audit';
import { createMemoryDecisionCache } from './cache';
import { MediaPolicyResolver } from './policy-resolver';
import {
  createMemoryReplayProtection,
  createMemorySignedAccessStore,
  SignedAccessService,
} from './signed-access';
import type { MediaContext, MediaPolicyInput } from './types';

const baseCtx = (overrides: Partial<MediaContext> = {}): MediaContext => ({
  omniaUserId: 'u1',
  role: 'student',
  courseId: 10,
  activityId: 5,
  materialId: 'm1',
  assetId: 'asset-1',
  purpose: 'view',
  origin: 'omnia.web',
  correlationId: 'corr-1',
  ...overrides,
});

const basePolicy = (overrides: Partial<MediaPolicyInput> = {}): MediaPolicyInput => ({
  downloadsAllowed: false,
  watermarkEnabled: true,
  mediaTtlSeconds: 300,
  ...overrides,
});

describe('MediaPolicyResolver', () => {
  const resolver = new MediaPolicyResolver();

  it('grants view, denies download by default', () => {
    const r = resolver.resolve(baseCtx(), basePolicy());
    assert.equal(r.capabilities.canView, true);
    assert.equal(r.capabilities.canDownload, false);
    assert.equal(r.denyReason, undefined);
  });

  it('denies download purpose when policy forbids', () => {
    const r = resolver.resolve(baseCtx({ purpose: 'download' }), basePolicy());
    assert.equal(r.denyReason, 'DENIED_DOWNLOAD_POLICY');
  });

  it('allows download when policy enables', () => {
    const r = resolver.resolve(
      baseCtx({ purpose: 'download' }),
      basePolicy({ downloadsAllowed: true }),
    );
    assert.equal(r.denyReason, undefined);
    assert.equal(r.capabilities.canDownload, true);
  });
});

describe('MediaAuthorizationService', () => {
  it('returns immutable controlled decision', async () => {
    const audit = createMemoryMediaAudit();
    const svc = new MediaAuthorizationService({
      audit,
      cache: createMemoryDecisionCache(),
    });
    const d = await svc.authorize({ context: baseCtx(), policy: basePolicy() });
    assert.equal(d.granted, true);
    assert.equal(d.controlledMode, true);
    assert.equal(d.reason, 'GRANTED_CONTROLLED_MODE');
    assert.ok(d.grantToken);
    assert.equal(audit.events.length, 1);
    assert.ok(Object.isFrozen(d));
  });

  it('denies download and audits', async () => {
    const audit = createMemoryMediaAudit();
    const svc = new MediaAuthorizationService({ audit });
    const d = await svc.authorize({
      context: baseCtx({ purpose: 'download' }),
      policy: basePolicy(),
    });
    assert.equal(d.granted, false);
    assert.equal(d.reason, 'DENIED_DOWNLOAD_POLICY');
    assert.equal(audit.events[0]?.decision, 'denied');
  });

  it('cache hit on second authorize', async () => {
    let cacheHits = 0;
    const svc = new MediaAuthorizationService({
      cache: createMemoryDecisionCache(),
      metrics: {
        incAuthorize() {},
        incSigned() {},
        incRevoked() {},
        incCacheHit() {
          cacheHits += 1;
        },
        observeLatency() {},
      },
    });
    await svc.authorize({ context: baseCtx(), policy: basePolicy() });
    const second = await svc.authorize({ context: baseCtx(), policy: basePolicy() });
    assert.equal(second.cached, true);
    assert.equal(cacheHits, 1);
  });
});

describe('SignedAccessService', () => {
  it('issues controlled-mock token and revokes', async () => {
    const store = createMemorySignedAccessStore();
    const signed = new SignedAccessService(store);
    const auth = new MediaAuthorizationService({
      cache: createMemoryDecisionCache(),
      replay: createMemoryReplayProtection(),
    });
    const decision = await auth.authorize({ context: baseCtx(), policy: basePolicy() });
    const token = await signed.issue(
      {
        decisionId: decision.decisionId,
        grantToken: decision.grantToken!,
        assetId: decision.assetId,
        omniaUserId: decision.omniaUserId,
        correlationId: decision.correlationId,
      },
      decision,
    );
    assert.equal(token.mode, 'controlled-mock');
    assert.ok(token.url.startsWith('controlled://'));
    const rev = await signed.revoke({
      tokenId: token.tokenId,
      omniaUserId: 'u1',
      correlationId: 'c',
    });
    assert.equal(rev.revoked, 1);
  });
});
