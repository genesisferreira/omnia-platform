import type { RuntimeAnswer } from '@omnia/neurofrigo-runtime';

import type { TechnicalContext } from '../domain/types';

const COMPARE_RE =
  /\b(compar(e|ar|a[cç][aã]o)|versus|\bv[sx]\.?\b|diferen[cç]a\s+entre|CO\s*2\s*[×x]\s*HFC|condensa[cç][aã]o|v[aá]lvula\s+eletr[oô]nica)\b/i;

export function wantsComparison(question: string, forced?: boolean): boolean {
  if (forced) return true;
  return COMPARE_RE.test(question);
}

/**
 * Technical Comparison — comparação ancorada somente em FONTES autorizadas.
 */
export function buildComparisonMarkdown(input: {
  question: string;
  answer: RuntimeAnswer;
  technicalContext: TechnicalContext;
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
    : '_Não encontrado nas fontes autorizadas — comparação não fundamentada._';

  const techLines = input.technicalContext.technologyLines.length
    ? input.technicalContext.technologyLines.map((l) => `- ${l}`).join('\n')
    : '- (linhas conforme FONTES)';

  return [
    '# Comparação técnica (fundamentada)',
    '',
    `**Empresa:** ${input.technicalContext.companyName}  `,
    `**Especialidade:** ${input.technicalContext.specialty}  `,
    `**Grounding:** ${hasSources ? 'com fontes' : 'sem fontes suficientes'}`,
    '',
    '## 1. Escopo da comparação',
    '',
    input.question.trim(),
    '',
    '## 2. Análise com base nas FONTES',
    '',
    groundedBody,
    '',
    '## 3. Linhas tecnológicas habilitadas (perfil)',
    '',
    techLines,
    '',
    '## 4. Limitações',
    '',
    '- Comparar somente tecnologias presentes nas FONTES.',
    '- Não inventar desempenho, normas ou custos.',
    '- Dimensionamento e simulações estão fora do escopo deste assistente.',
    '',
    '## 5. Referências',
    '',
    hasSources ? snippets : '_Nenhuma fonte recuperada._',
    '',
  ].join('\n');
}
