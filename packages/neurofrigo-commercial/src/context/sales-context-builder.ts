import type { CommercialProfile, SalesClientHint, SalesContext } from '../domain/types';

/**
 * SalesContextBuilder — monta contexto comercial a partir do perfil + hint do cliente.
 * Não acessa banco; não duplica ContextBuilder do Runtime.
 */
export function buildSalesContext(input: {
  profile: CommercialProfile;
  clientHint?: SalesClientHint | null;
}): SalesContext {
  const hint = input.clientHint || {};
  const segment = (hint.segment || input.profile.segment || 'industrial').trim();
  const region = (hint.region || input.profile.region || 'BR').trim();
  const clientCompany = (hint.companyName || '').trim();
  const productLine = (hint.productLine || '').trim();

  const lines = [
    `Empresa vendedora: ${input.profile.companyName}`,
    `Segmento foco: ${segment}`,
    `Região: ${region}`,
    `Idioma: ${input.profile.language}`,
    `Linhas de negócio: ${input.profile.businessLines.join(', ') || 'n/d'}`,
    `Catálogo permitido: ${input.profile.allowedCatalog.join(', ') || 'n/d'}`,
  ];
  if (clientCompany) lines.push(`Cliente alvo: ${clientCompany}`);
  if (productLine) lines.push(`Linha de interesse: ${productLine}`);
  if (input.profile.commercialPolicy.trim()) {
    lines.push(`Política comercial:\n${input.profile.commercialPolicy.trim()}`);
  }
  lines.push(
    'Regras: nunca inventar produtos/preços/prazos; use somente FONTES autorizadas do Knowledge Hub; não cite documentos internos restritos.',
  );

  return {
    companyName: input.profile.companyName,
    segment,
    region,
    language: input.profile.language,
    businessLines: input.profile.businessLines,
    allowedCatalog: input.profile.allowedCatalog,
    commercialPolicy: input.profile.commercialPolicy,
    clientHint: hint,
    summaryText: lines.join('\n'),
  };
}
