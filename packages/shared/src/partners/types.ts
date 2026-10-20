export type PublicPartnerMediaDto = {
  id: string;
  url: string;
  alt: string | null;
};

export type PublicPartnerTaxonomyDto = {
  id: string;
  name: string;
  slug: string;
};

export type PublicPartnerServiceCityDto = {
  city: string;
  state: string | null;
};

/** Card / listagem — campos públicos apenas. */
export type PublicPartnerListItemDto = {
  id: string;
  slug: string;
  companyName: string;
  tradeName: string | null;
  displayName: string;
  partnerType: 'company' | 'professional';
  city: string | null;
  state: string | null;
  country: string | null;
  coverageRadius: number | null;
  featured: boolean;
  verified: boolean;
  publishedAt: string | null;
  logo: PublicPartnerMediaDto | null;
  categories: PublicPartnerTaxonomyDto[];
  specialties: PublicPartnerTaxonomyDto[];
  /** km — só quando calculável a partir da origem da busca. */
  distanceKm: number | null;
};

/** Perfil público — sem documento, e-mail interno, notas, owner, aprovador. */
export type PublicPartnerDetailDto = PublicPartnerListItemDto & {
  description: string | null;
  servicesDescription: string | null;
  brandsServed: string[];
  serviceCities: PublicPartnerServiceCityDto[];
  website: string | null;
  phone: string | null;
  whatsapp: string | null;
  social: {
    instagram: string | null;
    linkedin: string | null;
    facebook: string | null;
    youtube: string | null;
  };
  gallery: Array<{ image: PublicPartnerMediaDto; caption: string | null }>;
  /** Coordenadas só se existirem (para mapas futuros / distância). */
  latitude: number | null;
  longitude: number | null;
  /** Exibir endereço completo só para empresas (privacidade de autônomos). */
  showFullAddress: boolean;
  addressLine: string | null;
};

export type PublicPartnerTaxonomyListDto = {
  ok: true;
  items: PublicPartnerTaxonomyDto[];
};
