export const MEMBERSHIP_ROLE_VALUES = ['owner', 'manager', 'editor', 'viewer'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLE_VALUES)[number];

export const MEMBERSHIP_STATUS_VALUES = ['invited', 'active', 'revoked'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUS_VALUES)[number];

export const LISTING_STATUS_VALUES = [
  'draft',
  'pending',
  'published',
  'rejected',
  'suspended',
  'archived',
] as const;
export type ListingStatus = (typeof LISTING_STATUS_VALUES)[number];

export const PRICE_MODE_VALUES = ['fixed', 'starting_at', 'on_request'] as const;
export type PriceMode = (typeof PRICE_MODE_VALUES)[number];

export const MARKETPLACE_CURRENCY = 'BRL';

export const QUOTE_SOURCE_TYPE_VALUES = ['product', 'service', 'project'] as const;
export type QuoteSourceType = (typeof QUOTE_SOURCE_TYPE_VALUES)[number];

export const QUOTE_STATUS_VALUES = [
  'submitted',
  'in_review',
  'proposal_sent',
  'negotiating',
  'accepted',
  'declined',
  'cancelled',
  'expired',
] as const;
export type QuoteStatus = (typeof QUOTE_STATUS_VALUES)[number];

export const QUOTE_TERMINAL_STATUSES: readonly QuoteStatus[] = [
  'accepted',
  'declined',
  'cancelled',
  'expired',
];

export const PROPOSAL_STATUS_VALUES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'withdrawn',
  'expired',
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUS_VALUES)[number];

export const QUOTE_EVENT_TYPE_VALUES = [
  'request_created',
  'status_changed',
  'message',
  'proposal_created',
  'proposal_sent',
  'proposal_accepted',
  'proposal_rejected',
  'proposal_withdrawn',
  'note',
] as const;
export type QuoteEventType = (typeof QUOTE_EVENT_TYPE_VALUES)[number];

export const QUOTE_EVENT_VISIBILITY_VALUES = ['internal', 'shared'] as const;
export type QuoteEventVisibility = (typeof QUOTE_EVENT_VISIBILITY_VALUES)[number];

export type PartnerCapability = 'view' | 'edit' | 'manage';
