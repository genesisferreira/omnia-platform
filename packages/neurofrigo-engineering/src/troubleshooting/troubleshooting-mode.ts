import type { RuntimeAnswer } from '@omnia/neurofrigo-runtime';

import type { TechnicalContext } from '../domain/types';

const TS_RE =
  /\b(troubleshoot|diagn[oó]stic[oa]|falha|defeito|n[aã]o\s+liga|alarme|anomalia|problema\s+t[eé]cnic|verificar\s+causa|modo\s+diagn[oó]stic)\b/i;

export function wantsTroubleshooting(question: string, forced?: boolean): boolean {
  if (forced) return true;
  return TS_RE.test(question);
}

/**
 * Troubleshooting Mode — hipóteses e verificações ancoradas nas FONTES.
 * Nunca afirma diagnóstico definitivo.
 */
export function buildTroubleshootingMarkdown(input: {
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
    : '_Não encontrado nas fontes autorizadas — não é possível montar diagnóstico fundamentado._';

  return [
    '# Modo Troubleshooting (assistido)',
    '',
    `**Empresa:** ${input.technicalContext.companyName}  `,
    `**Área:** ${input.technicalContext.technicalArea}  `,
    `**Especialidade:** ${input.technicalContext.specialty}  `,
    `**Grounding:** ${hasSources ? 'com fontes' : 'sem fontes suficientes'}`,
    '',
    '## 1. Problema informado',
    '',
    input.question.trim() || '_Não informado._',
    '',
    '## 2. Informações disponíveis',
    '',
    hasSources
      ? groundedBody
      : '_Sem conteúdo recuperado no Knowledge Hub autorizado._',
    '',
    '## 3. Hipóteses suportadas pela base',
    '',
    hasSources
      ? 'Hipóteses abaixo são **apenas** as que encontram respaldo nas FONTES. Não constituem diagnóstico definitivo.'
      : '_Não encontrado nas fontes._',
    '',
    hasSources ? groundedBody : '',
    '',
    '## 4. Possíveis verificações',
    '',
    hasSources
      ? 'Priorize verificações descritas nas FONTES (segurança, energia, sensores, fluidos, automação). Execute somente procedimentos autorizados e com EPI adequado.'
      : '_Não encontrado nas fontes._',
    '',
    '## 5. Aviso obrigatório',
    '',
    '- **Nunca** trate esta resposta como diagnóstico definitivo.',
    '- A confirmação depende de **inspeção técnica em campo** por profissional habilitado.',
    '- Normas e procedimentos somente se presentes nas FONTES.',
    `- Política: ${input.technicalContext.engineeringPolicy.slice(0, 400) || 'seguir política de engenharia do perfil.'}`,
    '',
    '## 6. Referências utilizadas',
    '',
    hasSources ? snippets : '_Nenhuma fonte recuperada._',
    '',
  ].join('\n');
}
