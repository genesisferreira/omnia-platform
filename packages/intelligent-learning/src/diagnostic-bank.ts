/**
 * Banco diagnóstico inicial ILS — stems distintos por domínio × dificuldade.
 * Scoring determinístico; não usa LLM. Origem: RULE_CURATED (auditável).
 */
import type { AdaptiveDifficulty, BankQuestion, TechnicalDomain } from './assessment';
import { TECHNICAL_DOMAINS } from './assessment';

export type DiagnosticQuestion = BankQuestion & {
  prompt: string;
  /** Gabarito interno — nunca expor na UI do aluno durante avaliação. */
  correctValue: string;
  explanation: string;
  competencyKey: string;
  approvalStatus: 'approved';
  origin: 'RULE_CURATED';
};

type Spec = {
  difficulty: AdaptiveDifficulty;
  type: DiagnosticQuestion['type'];
  prompt: string;
  correctValue: string;
  explanation: string;
};

const BY_DOMAIN: Record<TechnicalDomain, [Spec, Spec, Spec]> = {
  fundamentos: [
    {
      difficulty: 1,
      type: 'true_false',
      prompt:
        'No ciclo de compressão a vapor, o evaporador absorve calor do ambiente refrigerado. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'O evaporador é o trocador que absorve calor do espaço refrigerado.',
    },
    {
      difficulty: 2,
      type: 'true_false',
      prompt:
        'No ciclo básico, o condensador opera a pressão menor que a do evaporador. Esta afirmação é verdadeira?',
      correctValue: 'false',
      explanation: 'O condensador opera no lado de alta pressão, acima da pressão de evaporação.',
    },
    {
      difficulty: 3,
      type: 'true_false',
      prompt:
        'Se o compressor aspira líquido em quantidade relevante, há risco de dano mecânico por golpe de líquido. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Retorno de líquido à sucção pode danificar o compressor.',
    },
  ],
  comercial: [
    {
      difficulty: 1,
      type: 'true_false',
      prompt:
        'Em refrigeração comercial, balcões e câmaras de mercearia tipicamente usam evaporadores dedicados ao produto. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Aplicações comerciais usam evaporadores/expositores adequados ao produto.',
    },
    {
      difficulty: 2,
      type: 'true_false',
      prompt:
        'Descongelamento periódico é irrelevante em evaporadores de baixa temperatura com formação de gelo. Esta afirmação é verdadeira?',
      correctValue: 'false',
      explanation: 'Gelo reduz troca térmica; descongelamento é necessário em baixas temperaturas.',
    },
    {
      difficulty: 3,
      type: 'true_false',
      prompt:
        'Em um multiplex comercial, falha de um rack pode afetar vários móveis alimentados pelo mesmo circuito. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Arquiteturas multiplex compartilham compressão/circuito entre vários pontos.',
    },
  ],
  industrial: [
    {
      difficulty: 1,
      type: 'true_false',
      prompt:
        'Sistemas industriais de refrigeração frequentemente operam com cargas e potências maiores que aplicações comerciais leves. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Industrial tipicamente envolve maior capacidade e infraestrutura.',
    },
    {
      difficulty: 2,
      type: 'true_false',
      prompt:
        'Em planta industrial, isolar e etiquetar circuitos antes de intervenção não é prática de segurança. Esta afirmação é verdadeira?',
      correctValue: 'false',
      explanation: 'LOTO/isolamento e identificação são práticas básicas de segurança em planta.',
    },
    {
      difficulty: 3,
      type: 'true_false',
      prompt:
        'Ao analisar baixa capacidade em sistema industrial, comparar pressões/temperaturas de saturação com o projeto ajuda a delimitar causa. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Diagnóstico industrial usa evidência de processo versus baseline de projeto.',
    },
  ],
  eletricidade: [
    {
      difficulty: 1,
      type: 'true_false',
      prompt:
        'Antes de medir tensão em um quadro, deve-se confirmar instrumentos adequados e condição segura de acesso. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Segurança elétrica precede qualquer medição.',
    },
    {
      difficulty: 2,
      type: 'true_false',
      prompt:
        'Um motor trifásico pode operar indefinidamente com uma fase aberta sem aquecimento anormal. Esta afirmação é verdadeira?',
      correctValue: 'false',
      explanation: 'Falta de fase provoca sobrecarga/aquecimento e risco de falha.',
    },
    {
      difficulty: 3,
      type: 'true_false',
      prompt:
        'Disjuntor motor combina proteção contra curto e sobrecarga térmica para o circuito do motor. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Função típica do disjuntor motor em comandos de refrigeração.',
    },
  ],
  comandos: [
    {
      difficulty: 1,
      type: 'true_false',
      prompt:
        'Contatores e relés são usados para comandar cargas elétricas conforme lógica de controle. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Elementos básicos de comando elétrico.',
    },
    {
      difficulty: 2,
      type: 'true_false',
      prompt:
        'Um intertravamento de segurança pode ser ignorado se o técnico “conhece” o equipamento. Esta afirmação é verdadeira?',
      correctValue: 'false',
      explanation: 'Bypass de segurança não é prática autorizada.',
    },
    {
      difficulty: 3,
      type: 'true_false',
      prompt:
        'Na leitura de um diagrama de comando, identificar alimentação, sensores e atuadores é passo prévio a trocar peças. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Interpretação do diagrama evita troca cega de componentes.',
    },
  ],
  termodinamica: [
    {
      difficulty: 1,
      type: 'true_false',
      prompt:
        'Pressão e temperatura de saturação de um fluido refrigerante estão relacionadas na curva do fluido. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Relação P–T de saturação é fundamento termodinâmico.',
    },
    {
      difficulty: 2,
      type: 'true_false',
      prompt:
        'Superquecimento na saída do evaporador mede quanto o vapor está acima da temperatura de saturação correspondente à pressão de evaporação. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Definição operacional de superquecimento.',
    },
    {
      difficulty: 3,
      type: 'true_false',
      prompt:
        'Sub-resfriamento zero no condensador sempre indica o melhor COP possível, independentemente do ponto de operação. Esta afirmação é verdadeira?',
      correctValue: 'false',
      explanation: 'Sub-resfriamento adequado é desejável; zero não é automaticamente ótimo.',
    },
  ],
  leitura_tecnica: [
    {
      difficulty: 1,
      type: 'true_false',
      prompt:
        'Legendas e símbolos em um desenho P&ID ou elétrico devem ser consultados antes de interpretar o circuito. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Leitura técnica começa pela legenda/símbolos.',
    },
    {
      difficulty: 2,
      type: 'true_false',
      prompt:
        'Se o diagrama e a instalação física divergem, deve-se assumir que o diagrama está sempre errado e seguir só a memória. Esta afirmação é verdadeira?',
      correctValue: 'false',
      explanation: 'Divergências exigem verificação controlada, não chute.',
    },
    {
      difficulty: 3,
      type: 'true_false',
      prompt:
        'Rastrear um alarme exige correlacionar ponto de medição no desenho com sensor/atuador na planta. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Diagnóstico documental liga tag do desenho à realidade.',
    },
  ],
  diagnostico: [
    {
      difficulty: 1,
      type: 'true_false',
      prompt:
        'Um bom diagnóstico começa coletando sintomas, histórico recente e leituras básicas antes de trocar componentes. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Método: evidência antes de ação invasiva.',
    },
    {
      difficulty: 2,
      type: 'true_false',
      prompt:
        'Alta pressão de condensação com condensador sujo/obstruído é um cenário plausível a investigar. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Troca térmica degradada eleva pressão de condensação.',
    },
    {
      difficulty: 3,
      type: 'true_false',
      prompt:
        'Trocar o compressor deve ser a primeira ação sempre que a capacidade estiver baixa, sem checar carga, expansão e trocadores. Esta afirmação é verdadeira?',
      correctValue: 'false',
      explanation: 'Diagnóstico diferencial evita troca prematura do compressor.',
    },
  ],
  seguranca: [
    {
      difficulty: 1,
      type: 'true_false',
      prompt:
        'EPIs adequados e autorização de trabalho são requisitos antes de intervenções em equipamentos pressurizados. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Segurança e autorização antecedem a intervenção.',
    },
    {
      difficulty: 2,
      type: 'true_false',
      prompt:
        'Ventilação e detecção de vazamento são irrelevantes ao manusear fluidos refrigerantes em espaços confinados. Esta afirmação é verdadeira?',
      correctValue: 'false',
      explanation: 'Risco de asfixxia/toxicidade/inflamabilidade exige controles.',
    },
    {
      difficulty: 3,
      type: 'true_false',
      prompt:
        'Em emergência com vazamento significativo, isolar área, evacuar se necessário e seguir procedimento da planta tem prioridade sobre “terminar o serviço”. Esta afirmação é verdadeira?',
      correctValue: 'true',
      explanation: 'Prioridade é pessoas e contenção, não produtividade.',
    },
  ],
};

export function buildDiagnosticBank(): DiagnosticQuestion[] {
  return TECHNICAL_DOMAINS.flatMap((domain) =>
    BY_DOMAIN[domain].map((spec) => ({
      id: `${domain}-${spec.difficulty}`,
      domain,
      difficulty: spec.difficulty,
      type: spec.type,
      prompt: spec.prompt,
      correctValue: spec.correctValue,
      explanation: spec.explanation,
      competencyKey: domain,
      approvalStatus: 'approved' as const,
      origin: 'RULE_CURATED' as const,
    })),
  );
}

export function gradeDiagnosticAnswer(q: DiagnosticQuestion, raw: unknown): boolean {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();
  const expected = q.correctValue.toLowerCase();
  if (q.type === 'true_false') {
    const affirmative = value === 'true' || value === 'verdadeiro' || value === '1' || value === 'sim';
    const negative = value === 'false' || value === 'falso' || value === '0' || value === 'nao' || value === 'não';
    if (expected === 'true' || expected === 'verdadeiro') return affirmative;
    if (expected === 'false' || expected === 'falso') return negative;
  }
  return value === expected;
}

/** Garante variedade semântica mínima (anti-regressão do template único). */
export function assertDiagnosticSemanticVariety(bank: DiagnosticQuestion[] = buildDiagnosticBank()): {
  ok: boolean;
  uniquePrompts: number;
  total: number;
} {
  const prompts = bank.map((q) => q.prompt.trim().toLowerCase());
  const unique = new Set(prompts);
  return { ok: unique.size === prompts.length && prompts.length >= TECHNICAL_DOMAINS.length * 3, uniquePrompts: unique.size, total: prompts.length };
}
