import type {
  ListingStatus,
  MembershipRole,
  PriceMode,
  ProposalStatus,
  PublicMarketplaceListingDto,
  QuoteEventType,
  QuoteEventVisibility,
  QuoteSourceType,
  QuoteStatus,
} from '@omnia/shared';

import type { PortalUser } from '@/lib/auth/types';

export type { PublicMarketplaceListingDto };

export type MarketplaceListingKind = 'product' | 'service';

export type PublicMarketplacePagination = {
  page: number;
  limit: number;
  totalDocs: number;
  totalPages: number;
  hasNextPage: boolean;
};

export type PublicMarketplaceList = {
  items: PublicMarketplaceListingDto[];
  pagination: PublicMarketplacePagination;
};

export type PublicMarketplaceQueryInput = {
  q?: string;
  category?: string;
  brand?: string;
  page?: number;
  limit?: number;
  partner?: string;
};

/* --------------------------- Resumo do parceiro (admin) --------------------------- */

export type PartnerSummary = {
  id: string;
  slug: string | null;
  companyName: string | null;
  tradeName: string | null;
  displayName: string;
  partnerType: 'company' | 'professional';
  status: string | null;
  plan: string;
  active: boolean;
  verified: boolean;
  featured: boolean;
  publishedAt: string | null;
  city: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  description: string | null;
};

export type PartnerMembershipContext = {
  partner: PartnerSummary;
  role: MembershipRole;
  canEdit: boolean;
  canManage: boolean;
};

export type StatusCounts = {
  total: number;
  byStatus: Record<string, number>;
  truncated?: boolean;
};

export type PartnerDashboardStats = {
  products: StatusCounts;
  services: StatusCounts;
  quotes: StatusCounts & { open: number };
  proposals: StatusCounts;
};

export type PartnerDashboardResponse = {
  memberships: PartnerMembershipContext[];
  selected: PartnerMembershipContext | null;
  stats: PartnerDashboardStats | null;
};

export type PartnerContext = {
  user: PortalUser;
  token: string;
  memberships: PartnerMembershipContext[];
  selected: PartnerMembershipContext | null;
  /** false => nenhuma associação ativa (parceiro ainda não vinculado). */
  hasMembership: boolean;
  isStaff: boolean;
};

/* --------------------------- Documentos Payload (REST) --------------------------- */

export type RelationId = string | number;

export type ListingDoc = {
  id: RelationId;
  title: string;
  slug: string;
  partner: RelationId | { id: RelationId };
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  sku?: string | null;
  description?: string | null;
  priceMode: PriceMode;
  price?: number | null;
  currency?: string | null;
  status: ListingStatus;
  moderationNotes?: string | null;
  publishedAt?: string | null;
  images?: Array<{ id?: string; image: RelationId | { id: RelationId }; alt?: string | null }> | null;
  datasheet?: RelationId | { id: RelationId } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type QuoteRequestDoc = {
  id: RelationId;
  publicId: string;
  partner: RelationId | { id: RelationId; tradeName?: string | null; companyName?: string | null; slug?: string | null };
  buyerUser?: RelationId | { id: RelationId };
  sourceType: QuoteSourceType;
  productListing?: RelationId | { id: RelationId; title?: string } | null;
  serviceListing?: RelationId | { id: RelationId; title?: string } | null;
  description: string;
  quantity?: number | null;
  city?: string | null;
  state?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status: QuoteStatus;
  statusChangedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type QuoteEventDoc = {
  id: RelationId;
  quoteRequest: RelationId | { id: RelationId };
  type: QuoteEventType;
  visibility: QuoteEventVisibility;
  fromStatus?: QuoteStatus | null;
  toStatus?: QuoteStatus | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};

export type QuoteProposalDoc = {
  id: RelationId;
  quoteRequest: RelationId | { id: RelationId; publicId?: string };
  partner: RelationId | { id: RelationId };
  title: string;
  summary?: string | null;
  status: ProposalStatus;
  currentVersionNumber?: number | null;
  validUntil?: string | null;
  sentAt?: string | null;
  respondedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type QuoteProposalVersionDoc = {
  id: RelationId;
  proposal: RelationId | { id: RelationId };
  quoteRequest: RelationId | { id: RelationId };
  versionNumber: number;
  items?: Array<{ description: string; quantity: number; unitPriceCents: number }>;
  subtotalCents: number;
  discountCents?: number | null;
  shippingCents?: number | null;
  totalCents: number;
  validUntil?: string | null;
  deliveryDays?: number | null;
  paymentTerms?: string | null;
  notes?: string | null;
  sentAt?: string;
};

export type MembershipDoc = {
  id: RelationId;
  user: RelationId | { id: RelationId };
  partner: RelationId | { id: RelationId };
  role: MembershipRole;
  status: 'invited' | 'active' | 'revoked';
};

export type PaginatedDocs<T> = {
  docs: T[];
  totalDocs: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PayloadResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string };
