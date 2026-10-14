export const PUBLIC_CONTACT_BODY =
  'Para assuntos institucionais da Omnia Frigo Holding, use o formulário de interesse. Telefone, endereço e CNPJ só serão publicados quando estiverem formalmente autorizados.';

const EXACT_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    'Estrutura de tenants e empresas preparada para escalar.',
    'Várias frentes de atuação reunidas no mesmo ecossistema, cada uma com a sua identidade.',
  ],
  [
    'Conteúdo gerenciado via Payload CMS no painel admin.',
    'Informações da holding e das empresas reunidas para quem visita o site.',
  ],
  [
    'Identidade visual Omnia aplicada em portal e admin.',
    'A mesma identidade visual nas páginas públicas da holding.',
  ],
  ['CMS centralizado', 'Informação centralizada'],
  [
    'Nenhuma empresa cadastrada ainda. Execute o seed no admin ou cadastre via Payload CMS.',
    'Nenhuma empresa pública está disponível neste momento.',
  ],
];

export function isProvisionalContactCopy(value: string): boolean {
  return value.includes('preferências globais do CMS') || value.includes('Em breve, formulário');
}

/** Troca jargão interno já publicado no CMS por texto de visitante. Não inventa dados. */
export function sanitizePublicCopy(value: string): string {
  if (isProvisionalContactCopy(value)) return PUBLIC_CONTACT_BODY;
  let next = value;
  for (const [from, to] of EXACT_REPLACEMENTS) {
    if (next.includes(from)) next = next.split(from).join(to);
  }
  return next;
}
