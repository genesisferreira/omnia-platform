import type { PublicPartnerDetailDto } from '@omnia/shared';

type TrustIndicatorsProps = {
  partner: Pick<
    PublicPartnerDetailDto,
    'verified' | 'featured' | 'publishedAt' | 'coverageRadius' | 'specialties' | 'partnerType'
  >;
};

export function TrustIndicators({ partner }: TrustIndicatorsProps) {
  const items: string[] = ['Parceiro aprovado'];

  if (partner.verified) {
    items.push(
      partner.partnerType === 'professional'
        ? 'Profissional verificado'
        : 'Empresa verificada',
    );
  }
  if (partner.featured) {
    items.push('Parceiro em destaque');
  }
  if (partner.coverageRadius != null && partner.coverageRadius > 0) {
    items.push(`Atende em até ${partner.coverageRadius} km`);
  }
  if (partner.specialties.length > 0) {
    items.push(`${partner.specialties.length} especialidade(s)`);
  }
  if (partner.publishedAt) {
    const year = new Date(partner.publishedAt).getFullYear();
    if (Number.isFinite(year)) {
      items.push(`Na rede desde ${year}`);
    }
  }

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Indicadores de confiança">
      {items.map((label) => (
        <li
          key={label}
          className="border border-omnia-deep-blue/15 bg-omnia-deep-blue/5 px-3 py-1 text-xs font-medium text-omnia-deep-blue"
        >
          {label}
        </li>
      ))}
    </ul>
  );
}
