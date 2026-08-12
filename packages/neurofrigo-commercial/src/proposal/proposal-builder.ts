import type { RuntimeAnswer } from '@omnia/neurofrigo-runtime';

import type { SalesContext } from '../domain/types';

const PROPOSAL_RE =
  /\b(proposta(\s+comercial)?|gerar\s+proposta|montar\s+(uma\s+)?(proposta|oferta)|oferta\s+comercial|pitch\s+comercial)\b/i;

export function wantsProposal(question: string, forced?: boolean): boolean {
  if (forced) return true;
  return PROPOSAL_RE.test(question);
}

/**
 * ProposalBuilder — Markdown estruturado ancorado nas fontes da resposta.
 * Sem PDF. Seções sem suporte nas fontes ficam explícitas.
 */
export function buildProposalMarkdown(input: {
  question: string;
  answer: RuntimeAnswer;
  salesContext: SalesContext;
}): string {
  const sources = input.answer.sources || [];
  const hasSources = sources.length > 0;
  const snippets = sources
    .slice(0, 6)
    .map((s, i) => {
      const preview = (s.text || '').replace(/\s+/g, ' ').trim().slice(0, 220);
      return `${i + 1}. ${preview}${preview.length >= 220 ? '…' : ''}`;
    })
    .join('\n');

  const groundedBody = hasSources
    ? input.answer.formattedText || input.answer.text
    : '_Não encontrado nas fontes autorizadas — não é possível montar proposta fundamentada._';

  const catalog = input.salesContext.allowedCatalog.length
    ? input.salesContext.allowedCatalog.map((c) => `- ${c}`).join('\n')
    : '- (catálogo não informado no perfil; usar apenas FONTES)';

  const lines = input.salesContext.businessLines.length
    ? input.salesContext.businessLines.map((l) => `- ${l}`).join('\n')
    : '- (linhas conforme FONTES)';

  return [
    '# Proposta Comercial (rascunho)',
    '',
    `**Empresa:** ${input.salesContext.companyName}  `,
    `**Segmento:** ${input.salesContext.segment}  `,
    `**Região:** ${input.salesContext.region}  `,
    `**Grounding:** ${hasSources ? 'com fontes' : 'sem fontes suficientes'}`,
    '',
    '## 1. Resumo executivo',
    '',
    groundedBody,
    '',
    '## 2. Problema do cliente',
    '',
    hasSources ? `Demanda expressa: ${input.question.trim()}` : '_Não encontrado nas fontes._',
    '',
    '## 3. Solução recomendada',
    '',
    hasSources
      ? 'Com base nas FONTES recuperadas, a solução deve limitar-se ao portfólio e serviços descritos abaixo e no material citado.'
      : '_Não encontrado nas fontes._',
    '',
    '### Linhas de negócio habilitadas',
    lines,
    '',
    '### Catálogo permitido (perfil)',
    catalog,
    '',
    '## 4. Benefícios',
    '',
    hasSources
      ? 'Benefícios descritos apenas quando presentes nas FONTES (eficiência, conformidade, formação, suporte).'
      : '_Não encontrado nas fontes._',
    '',
    '## 5. Diferenciais',
    '',
    hasSources
      ? 'Diferenciais Omnia/Neurofrigo conforme material institucional/técnico autorizado.'
      : '_Não encontrado nas fontes._',
    '',
    '## 6. Serviços relacionados',
    '',
    hasSources
      ? 'Serviços mencionados nas FONTES (implantação, suporte, consultoria) — sem inventar escopo.'
      : '_Não encontrado nas fontes._',
    '',
    '## 7. Treinamentos relacionados',
    '',
    hasSources
      ? 'Cursos/treinamentos citados nas FONTES ou catálogo LMS autorizado.'
      : '_Não encontrado nas fontes._',
    '',
    '## 8. Observações',
    '',
    '- Esta proposta é um rascunho assistido por IA e **não** constitui orçamento financeiro.',
    '- Preços, prazos e SLAs somente se constarem explicitamente nas FONTES.',
    `- Política: ${input.salesContext.commercialPolicy.slice(0, 400) || 'seguir política comercial do perfil.'}`,
    '',
    '## Fontes utilizadas',
    '',
    hasSources ? snippets : '_Nenhuma fonte recuperada._',
    '',
  ].join('\n');
}
