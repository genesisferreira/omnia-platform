import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MEMBERSHIP_ROLES,
  QUOTE_STATUS_VALUES,
  LISTING_STATUS_VALUES,
  QUOTE_TERMINAL_STATUSES,
  canEdit,
  canManagePermissions,
  canTransitionListing,
  canTransitionQuote,
  roleHasCapability,
} from '../index';

describe('canTransitionQuote', () => {
  it('permite o fluxo feliz', () => {
    assert.equal(canTransitionQuote('submitted', 'in_review'), true);
    assert.equal(canTransitionQuote('in_review', 'proposal_sent'), true);
    assert.equal(canTransitionQuote('proposal_sent', 'accepted'), true);
    assert.equal(canTransitionQuote('proposal_sent', 'negotiating'), true);
    assert.equal(canTransitionQuote('negotiating', 'proposal_sent'), true);
  });

  it('bloqueia saltos e retrocessos', () => {
    assert.equal(canTransitionQuote('submitted', 'accepted'), false);
    assert.equal(canTransitionQuote('submitted', 'proposal_sent'), false);
    assert.equal(canTransitionQuote('proposal_sent', 'submitted'), false);
  });

  it('estados terminais não transitam', () => {
    for (const from of QUOTE_TERMINAL_STATUSES) {
      for (const to of QUOTE_STATUS_VALUES) {
        assert.equal(canTransitionQuote(from, to), false, `${from} -> ${to}`);
      }
    }
  });

  it('rejeita auto-transição e valores inválidos', () => {
    for (const s of QUOTE_STATUS_VALUES) assert.equal(canTransitionQuote(s, s), false);
    assert.equal(canTransitionQuote('foo', 'accepted'), false);
    assert.equal(canTransitionQuote('submitted', undefined), false);
  });
});

describe('canTransitionListing', () => {
  it('permite moderação', () => {
    assert.equal(canTransitionListing('draft', 'pending'), true);
    assert.equal(canTransitionListing('pending', 'published'), true);
    assert.equal(canTransitionListing('pending', 'rejected'), true);
    assert.equal(canTransitionListing('published', 'suspended'), true);
    assert.equal(canTransitionListing('suspended', 'published'), true);
    assert.equal(canTransitionListing('rejected', 'draft'), true);
    assert.equal(canTransitionListing('archived', 'draft'), true);
  });

  it('bloqueia publicação direta sem moderação', () => {
    assert.equal(canTransitionListing('draft', 'published'), false);
    assert.equal(canTransitionListing('rejected', 'published'), false);
    assert.equal(canTransitionListing('archived', 'published'), false);
  });

  it('rejeita auto-transição e valores inválidos', () => {
    for (const s of LISTING_STATUS_VALUES) assert.equal(canTransitionListing(s, s), false);
    assert.equal(canTransitionListing('foo', 'draft'), false);
  });
});

describe('MEMBERSHIP_ROLES', () => {
  it('owner e manager editam e gerenciam permissões', () => {
    for (const role of ['owner', 'manager'] as const) {
      assert.equal(canEdit(role), true);
      assert.equal(canManagePermissions(role), true);
    }
  });

  it('editor edita mas não gerencia; viewer só visualiza', () => {
    assert.equal(canEdit('editor'), true);
    assert.equal(canManagePermissions('editor'), false);
    assert.equal(canEdit('viewer'), false);
    assert.equal(canManagePermissions('viewer'), false);
    assert.equal(MEMBERSHIP_ROLES.viewer.canEdit, false);
  });

  it('roleHasCapability e papéis desconhecidos', () => {
    assert.equal(roleHasCapability('viewer', 'view'), true);
    assert.equal(roleHasCapability('viewer', 'edit'), false);
    assert.equal(roleHasCapability('editor', 'edit'), true);
    assert.equal(roleHasCapability('editor', 'manage'), false);
    assert.equal(roleHasCapability('owner', 'manage'), true);
    assert.equal(roleHasCapability('hacker', 'view'), false);
    assert.equal(canEdit(undefined), false);
  });
});
