import { sanitizeEvidenceText } from './sanitize-evidence';
import { PASSAGE_RELEVANCE_MIN, rankSentencesByRelevance } from '../context/passage-relevance';
import {
  isUnsupportedInventionQuestion,
  unsupportedKnowledgeRejection,
} from './unsupported-knowledge';

export type EvidenceItem = {
  id?: string;
  text: string;
  score?: number;
};

export type PublicCourseFact = {
  title: string;
  slug?: string | null;
  shortDescription?: string | null;
  level?: string | null;
  category?: string | null;
  estimatedHours?: number | null;
  providerHint?: string | null;
};

function sentencesFrom(text: string, max = 12): string[] {
  const cleaned = sanitizeEvidenceText(text);
  if (!cleaned) return [];
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 28)
    .slice(0, max);
}

function uniqueSentences(items: string[], max = 5): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of items) {
    const key = s.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function isCourseDiscovery(question: string): boolean {
  return /quais?\s+cursos|que\s+cursos|cursos\s+voc[eê]s|oferecem?\s+cursos|cat[aá]logo|forma[cç][aã]o|treinamentos?/i.test(
    question,
  );
}

function isServiceDiscovery(question: string): boolean {
  return /quais?\s+servi[cç]os|servi[cç]os\s+voc[eê]s|o\s+que\s+oferecem|renova[cç][aã]o\s+oferece/i.test(
    question,
  );
}

function isCompanyRouting(question: string): boolean {
  return /qual\s+empresa|quem\s+(faz|oferece|cuida|trabalha|instala)|procurar\s+para|c[aâ]mara\s+frigor|projeto\s+de\s+refrigera/i.test(
    question,
  );
}

function isInstitutional(question: string): boolean {
  return /o\s+que\s+[eé]\s+(a\s+)?omnia|omnia\s+frigo|ecossistema|empresas\s+fazem\s+parte|holding/i.test(
    question,
  );
}

function formatCourseLine(c: PublicCourseFact): string {
  const bits: string[] = [`**${c.title}**`];
  if (c.level) bits.push(`nível ${c.level}`);
  if (c.category) bits.push(String(c.category));
  if (c.estimatedHours != null && Number.isFinite(c.estimatedHours)) {
    bits.push(`~${c.estimatedHours}h`);
  }
  const head = bits.join(' · ');
  const desc = c.shortDescription?.trim();
  const provider = c.providerHint?.trim();
  const tail = [desc || null, provider ? `Oferecido no ecossistema por ${provider}.` : null]
    .filter(Boolean)
    .join(' ');
  return `- ${head}${tail ? ` — ${tail}` : ''}`;
}

/**
 * Conversational synthesis from authorized evidence (+ optional live catalog).
 * Does not invent facts beyond evidence/catalog.
 */
export function synthesizeConversationalAnswer(input: {
  question: string;
  evidence: EvidenceItem[];
  intent?: string | null;
  assistantKey?: string | null;
  channel?: string | null;
  publicCourses?: PublicCourseFact[] | null;
  history?: Array<{ question: string; answer: string }> | null;
}): string {
  const question = input.question.trim();
  const assistant = (input.assistantKey || '').toLowerCase();
  const isPublic = input.channel === 'portal_public' || assistant === 'concierge';
  const courses = input.publicCourses || [];

  // Unsupported invention: never synthesize from lesson passages (session leak guard).
  if (isUnsupportedInventionQuestion(question)) {
    return unsupportedKnowledgeRejection();
  }

  if (isCourseDiscovery(question) && courses.length > 0) {
    const lines = courses.slice(0, 8).map(formatCourseLine);
    const providerNote =
      'No ecossistema Omnia, a formação é conduzida principalmente pelo Fred do Frio e pelo CTE, com apoio da plataforma digital.';
    return [
      'Hoje estes são os cursos públicos publicados na plataforma Omnia:',
      '',
      ...lines,
      '',
      providerNote,
      '',
      'Se quiser, indico o mais adequado ao seu nível ou objetivo.',
    ].join('\n');
  }

  const evidenceSentences = uniqueSentences(
    // Rank across the full authorized lesson body — do not truncate to the
    // first 4 sentences before relevance (Q3 first-step lived past sentence 4).
    input.evidence.flatMap((e) => sentencesFrom(e.text, 16)),
    12,
  );

  if (!evidenceSentences.length && courses.length === 0) {
    return isPublic
      ? 'Não encontrei informação pública suficiente para responder isso com segurança. Posso ajudar com cursos, serviços, empresas do grupo ou soluções de refrigeração.'
      : 'Não encontrei evidência suficiente na base autorizada para afirmar isso com segurança.';
  }

  // Follow-up shorthand: "qual é melhor para iniciante?" with prior course context
  const last = input.history?.length ? input.history[input.history.length - 1] : null;
  if (
    last &&
    /iniciante|melhor|quem\s+oferece|quanto\s+tempo|dura[cç][aã]o|e\s+quem/i.test(question) &&
    (/curso/i.test(last.question) || /curso/i.test(last.answer))
  ) {
    if (/iniciante|melhor/i.test(question)) {
      if (courses.length) {
        const beginner =
          courses.find((c) =>
            /inician|fundament|b[aá]sic|intro/i.test(`${c.title} ${c.level} ${c.shortDescription}`),
          ) ||
          courses.find((c) => /beginner|b[aá]sic|fundament/i.test(String(c.level || ''))) ||
          courses[0]!;
        return [
          `Para quem está começando, o caminho mais natural entre os cursos públicos é **${beginner.title}**.`,
          beginner.shortDescription?.trim() ||
            'Ele apresenta fundamentos e serve como porta de entrada antes de temas mais avançados.',
          '',
          'A formação no ecossistema costuma ser conduzida pelo Fred do Frio (educação moderna) ou pelo CTE (base técnica), conforme o objetivo.',
          '',
          'Quer que eu explique o conteúdo desse curso ou compare com outra opção?',
        ].join('\n');
      }
      const courseHint = evidenceSentences.find((s) => /curso|fred|cte|forma[cç]/i.test(s));
      return [
        'Para iniciantes, o ecossistema Omnia recomenda começar pela formação em fundamentos de refrigeração.',
        courseHint ||
          'Os cursos e treinamentos são oferecidos principalmente pelo Fred do Frio e pelo CTE.',
        '',
        'Posso detalhar o curso publicado mais adequado ao seu objetivo.',
      ].join('\n');
    }
    if (/quem\s+oferece|e\s+quem/i.test(question)) {
      return [
        'No ecossistema Omnia, os cursos e treinamentos são oferecidos principalmente pelo **Fred do Frio** (educação moderna e especialização) e pelo **CTE** (formação técnica e normativa).',
        '',
        'Se quiser, indico qual caminho combina melhor com o seu objetivo.',
      ].join('\n');
    }
  }

  if (isInstitutional(question)) {
    const lead =
      evidenceSentences.find((s) => /omnia frigo holding|hub integrador/i.test(s)) ||
      evidenceSentences[0];
    const companies = evidenceSentences.find((s) =>
      /renova[cç]|fred do frio|cte|neurofrigo/i.test(s),
    );
    return [
      lead ||
        'A Omnia Frigo Holding é o hub integrador do ecossistema de refrigeração que une tradição, educação e inteligência artificial aplicada.',
      '',
      companies ||
        'Fazem parte do ecossistema a Renovação Refrigeração, Fred do Frio, CTE, Neurofrigo Command IA e Neurofrigo Carga.',
      '',
      'Posso detalhar cursos, serviços ou indicar a empresa mais adequada ao que você precisa.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (isServiceDiscovery(question)) {
    const serviceBits = evidenceSentences.filter((s) =>
      /servi[cç]o|engenharia|instala|manuten|projeto|retrofit|comission/i.test(s),
    );
    const body = (serviceBits.length ? serviceBits : evidenceSentences).slice(0, 4);
    return [
      'No ecossistema Omnia, os serviços técnicos são liderados pela **Renovação Refrigeração**.',
      '',
      ...body.map((s) => `- ${s}`),
      '',
      'Para educação, o caminho é Fred do Frio / CTE; para tecnologia e IA aplicada, Neurofrigo Command IA.',
      '',
      'Quer que eu indique a empresa certa para o seu caso?',
    ].join('\n');
  }

  if (isCompanyRouting(question)) {
    if (/curso|estud|forma[cç]|especializ/i.test(question)) {
      return [
        'Para cursos e especialização, procure o **Fred do Frio** (educação moderna) ou o **CTE** (formação técnica e normativa).',
        '',
        'Se o foco for execução de projeto ou instalação, a empresa adequada é a **Renovação Refrigeração**.',
        '',
        'Me diga se você busca formação ou serviço técnico que eu afunilo a recomendação.',
      ].join('\n');
    }
    if (/ia|intelig[eê]ncia|neurofrigo|automa[cç]/i.test(question)) {
      return [
        'Para tecnologia, automação e IA aplicada à refrigeração, a empresa do ecossistema é a **Neurofrigo Command IA**.',
        '',
        'Se também precisar de execução de campo, a Renovação Refrigeração cobre engenharia e implantação.',
      ].join('\n');
    }
    return [
      'Para projeto, instalação, manutenção ou câmara frigorífica, a empresa a procurar é a **Renovação Refrigeração**.',
      '',
      evidenceSentences[0] ||
        'Ela concentra engenharia, projetos e soluções técnicas de refrigeração industrial e comercial.',
      '',
      'Se quiser, descrevo o próximo passo típico para o seu cenário.',
    ].join('\n');
  }

  // Tutor pedagogical tone — grounded synthesis, not lead-sentence dump
  if (
    assistant === 'tutor' ||
    input.intent === 'explanation' ||
    input.intent === 'definition' ||
    input.intent === 'procedural' ||
    input.intent === 'troubleshooting'
  ) {
    const ranked = rankSentencesByRelevance(
      question,
      evidenceSentences,
      PASSAGE_RELEVANCE_MIN * 0.85,
    );
    if (!ranked.length) {
      return isUnsupportedInventionQuestion(question)
        ? unsupportedKnowledgeRejection()
        : 'Não encontrei no material autorizado desta aula um trecho suficientemente relacionado a essa pergunta. Reformule com o conceito da aula ou avance para o próximo passo no LMS.';
    }
    const primary = ranked[0]!.text;
    const support = ranked.slice(1, 3).map((s) => s.text);
    const whyLead =
      /por\s+que|porque|pra\s+que|para\s+que|qual\s+(deve\s+ser\s+)?(o\s+|meu\s+)?primeiro|o\s+que\s+faz|quando\s+(o\s+)?equipamento/i.test(
        question,
      );
    const lines = [
      whyLead ? primary : `Com base no material autorizado da aula: ${primary}`,
      '',
      ...(support.length ? support.map((s) => `- ${s}`) : []),
      '',
      input.intent === 'troubleshooting'
        ? 'Próximo passo de estudo: confirme no equipamento os parâmetros que o material correlaciona (não use um único indicador isolado).'
        : input.intent === 'procedural'
          ? 'Próximo passo de estudo: execute só o que o material autoriza como primeira verificação, sem pular etapas de segurança.'
          : 'Se quiser, posso explicar de outro jeito, dar um exemplo ou indicar o próximo passo no curso.',
    ];
    return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
  }

  if (input.intent === 'troubleshooting' || assistant === 'engineering') {
    return [
      'Com base no material técnico autorizado:',
      '',
      ...evidenceSentences.slice(0, 4).map((s, i) => `${i + 1}. ${s}`),
      '',
      'Para avançar com segurança no diagnóstico, confirme os parâmetros operacionais disponíveis (pressões, temperaturas e condição do sistema). Não afirmo causa definitiva sem esses dados.',
    ].join('\n');
  }

  if (assistant === 'commercial') {
    return [
      'Pelos materiais comerciais autorizados, estas são as orientações mais relevantes:',
      '',
      ...evidenceSentences.slice(0, 4).map((s) => `- ${s}`),
      '',
      'Para recomendar com precisão, ajuda saber porte da operação, tecnologia atual e objetivo (energia, confiabilidade, expansão etc.).',
    ].join('\n');
  }

  // Default Concierge / general: natural paragraph + optional bullets
  const lead = evidenceSentences[0]!;
  const more = evidenceSentences.slice(1, 4);
  return [
    lead,
    '',
    ...(more.length > 1 ? more.map((s) => `- ${s}`) : more),
    '',
    isPublic
      ? 'Se quiser, continuo com cursos, serviços ou a empresa mais adequada ao seu objetivo.'
      : 'Posso aprofundar qualquer trecho com base no material autorizado.',
  ]
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n');
}
