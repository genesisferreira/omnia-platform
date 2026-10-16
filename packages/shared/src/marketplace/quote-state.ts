import {
  LISTING_STATUS_VALUES,
  MEMBERSHIP_ROLE_VALUES,
  QUOTE_STATUS_VALUES,
  type ListingStatus,
  type MembershipRole,
  type PartnerCapability,
  type QuoteStatus,
} from './constants';

const QUOTE_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  submitted: ['in_review', 'declined', 'cancelled', 'expired'],
  in_review: ['proposal_sent', 'declined', 'cancelled', 'expired'],
  proposal_sent: ['negotiating', 'accepted', 'declined', 'cancelled', 'expired'],
  negotiating: ['proposal_sent', 'accepted', 'declined', 'cancelled', 'expired'],
  accepted: [],
  declined: [],
  cancelled: [],
  expired: [],
};

const LISTING_TRANSITIONS: Record<ListingStatus, readonly ListingStatus[]> = {
  draft: ['pending', 'archived'],
  pending: ['published', 'rejected', 'draft'],
  published: ['suspended', 'archived', 'pending'],
  rejected: ['draft', 'pending', 'archived'],
  suspended: ['published', 'archived'],
  archived: ['draft'],
};

export function isQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === 'string' && (QUOTE_STATUS_VALUES as readonly string[]).includes(value);
}

export function isListingStatus(value: unknown): value is ListingStatus {
  return typeof value === 'string' && (LISTING_STATUS_VALUES as readonly string[]).includes(value);
}

export function canTransitionQuote(from: unknown, to: unknown): boolean {
  if (!isQuoteStatus(from) || !isQuoteStatus(to)) return false;
  return QUOTE_TRANSITIONS[from].includes(to);
}

export function canTransitionListing(from: unknown, to: unknown): boolean {
  if (!isListingStatus(from) || !isListingStatus(to)) return false;
  return LISTING_TRANSITIONS[from].includes(to);
}

export const MEMBERSHIP_ROLES: Record<
  MembershipRole,
  { label: string; canEdit: boolean; canManagePermissions: boolean }
> = {
  owner: { label: 'Proprietário', canEdit: true, canManagePermissions: true },
  manager: { label: 'Gerente', canEdit: true, canManagePermissions: true },
  editor: { label: 'Editor', canEdit: true, canManagePermissions: false },
  viewer: { label: 'Visualizador', canEdit: false, canManagePermissions: false },
};

export function isMembershipRole(value: unknown): value is MembershipRole {
  return typeof value === 'string' && (MEMBERSHIP_ROLE_VALUES as readonly string[]).includes(value);
}

export function canEdit(role: unknown): boolean {
  return isMembershipRole(role) && MEMBERSHIP_ROLES[role].canEdit;
}

export function canManagePermissions(role: unknown): boolean {
  return isMembershipRole(role) && MEMBERSHIP_ROLES[role].canManagePermissions;
}

export function roleHasCapability(role: unknown, capability: PartnerCapability): boolean {
  if (!isMembershipRole(role)) return false;
  if (capability === 'view') return true;
  if (capability === 'edit') return canEdit(role);
  return canManagePermissions(role);
}
