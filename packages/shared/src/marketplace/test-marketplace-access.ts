import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canAcceptInvitationWithPlatformRole,
  canChangeMembershipRole,
  canInviteRole,
  diffListingRevision,
  invitationEffectiveStatus,
  normalizeInviteEmail,
  requiresRevision,
  revisionPatchFrom,
} from './index';

describe('convites de parceiro', () => {
  it('owner e staff convidam qualquer papel; manager não cria owner; editor/viewer não convidam', () => {
    assert.equal(canInviteRole('staff', 'owner'), true);
    assert.equal(canInviteRole('owner', 'owner'), true);
    assert.equal(canInviteRole('manager', 'owner'), false);
    assert.equal(canInviteRole('manager', 'editor'), true);
    assert.equal(canInviteRole('editor', 'viewer'), false);
    assert.equal(canInviteRole('viewer', 'viewer'), false);
  });

  it('manager não altera nem promove owners', () => {
    assert.equal(canChangeMembershipRole('manager', 'owner', 'viewer'), false);
    assert.equal(canChangeMembershipRole('manager', 'editor', 'owner'), false);
    assert.equal(canChangeMembershipRole('manager', 'viewer', 'editor'), true);
    assert.equal(canChangeMembershipRole('owner', 'manager', 'owner'), true);
    assert.equal(canChangeMembershipRole('editor', 'viewer', 'editor'), false);
  });

  it('contas acadêmicas não aceitam convites', () => {
    assert.equal(canAcceptInvitationWithPlatformRole('student'), false);
    assert.equal(canAcceptInvitationWithPlatformRole('instructor'), false);
    assert.equal(canAcceptInvitationWithPlatformRole('client'), true);
    assert.equal(canAcceptInvitationWithPlatformRole('partner'), true);
    assert.equal(canAcceptInvitationWithPlatformRole(undefined), false);
  });

  it('expiração e normalização de e-mail', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    assert.equal(
      invitationEffectiveStatus({ status: 'pending', expiresAt: '2026-10-20T00:00:00Z' }, now),
      'pending',
    );
    assert.equal(
      invitationEffectiveStatus({ status: 'pending', expiresAt: '2026-10-19T11:59:59Z' }, now),
      'expired',
    );
    assert.equal(invitationEffectiveStatus({ status: 'pending' }, now), 'expired');
    assert.equal(
      invitationEffectiveStatus({ status: 'revoked', expiresAt: '2030-01-01T00:00:00Z' }, now),
      'revoked',
    );
    assert.equal(normalizeInviteEmail('  Fulano@Empresa.COM.br '), 'fulano@empresa.com.br');
    assert.equal(normalizeInviteEmail('sem-arroba'), null);
  });
});

describe('revisão de anúncios publicados', () => {
  it('só anúncios publicados ou suspensos exigem revisão', () => {
    assert.equal(requiresRevision('published'), true);
    assert.equal(requiresRevision('suspended'), true);
    assert.equal(requiresRevision('draft'), false);
    assert.equal(requiresRevision('pending'), false);
  });

  it('diff só considera campos moderados e alterados', () => {
    const current = {
      title: 'Compressor',
      price: 1000,
      priceMode: 'fixed',
      images: [{ image: { id: 3 }, alt: 'a' }],
      datasheet: { id: 9 },
      status: 'published',
    };
    const changes = diffListingRevision('product', current, {
      title: 'Compressor',
      price: 1200,
      images: [{ image: 3, alt: 'a' }, { image: 4 }],
      datasheet: 9,
      status: 'published',
    });
    assert.deepEqual(Object.keys(changes).sort(), ['images', 'price']);
    assert.deepEqual(changes.price, { from: 1000, to: 1200 });
    assert.deepEqual(revisionPatchFrom(changes).images, [
      { image: '3', alt: 'a' },
      { image: '4', alt: null },
    ]);
  });

  it('serviço ignora campos exclusivos de produto', () => {
    const changes = diffListingRevision(
      'service',
      { title: 'A' },
      { brand: 'X', sku: 'Y', title: 'B' },
    );
    assert.deepEqual(Object.keys(changes), ['title']);
  });
});
