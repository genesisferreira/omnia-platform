import { humanizeLevel, naturalizeUserText } from './naturalize-text';
import type { ConversationState, DialogueIntent } from './dialogue-types';
import type { PublicCourseFact } from './synthesize-answer';
import { pendingOfferFromOptions } from './conversation-state';
import type { PendingOffer } from './dialogue-types';

export function composeDialogueAnswer(input: {
  dialogueIntent: DialogueIntent;
  state: ConversationState;
  publicCourses?: PublicCourseFact[] | null;
  evidenceTexts?: string[];
  clarificationText?: string | null;
}): { text: string; pendingOffer: PendingOffer | null; topic: string } {
  if (input.clarificationText) {
    return {
      text: naturalizeUserText(input.clarificationText),
      pendingOffer: input.state.pendingOffer,
      topic: input.dialogueIntent,
    };
  }

  switch (input.dialogueIntent) {
    case 'course_catalog':
      return composeCourseCatalog(input.publicCourses || [], input.state);
    case 'course_recommendation':
      return composeCourseRecommendation(input.publicCourses || [], input.state);
    case 'services':
      return composeServices(input.evidenceTexts || []);
    case 'company_routing':
      return composeCompanyRouting(input.state);
    case 'institutional_overview':
      return composeInstitutional(input.evidenceTexts || []);
    case 'commercial_discovery':
      return composeCommercial(input.state);
    case 'engineering_troubleshooting':
      return composeEngineering(input.state);
    case 'teaching_rephrase':
      return {
        text: [
          'Sem problema — vou explicar de forma mais simples.',
          '',
          input.state.tutorConcept
            ? `Sobre **${input.state.tutorConcept}**: pense no essencial do conceito em uma frase prática, sem jargão.`
            : 'Foque na ideia central em uma frase e depois no “para que serve” no dia a dia.',
          '',
          'Se quiser, no próximo passo eu te dou um exemplo concreto.',
        ].join('\n'),
        pendingOffer: pendingOfferFromOptions(['give_example', 'check_understanding'], 'choice'),
        topic: 'teaching',
      };
    case 'teaching_example':
      return {
        text: [
          input.state.tutorConcept
            ? `Exemplo prático ligado a **${input.state.tutorConcept}**:`
            : 'Exemplo prático:',
          '',
          'Imagine a situação no campo: você observa o sintoma, verifica o parâmetro principal e só então ajusta — assim o conceito deixa de ser abstrato.',
          '',
          'Quer que eu faça uma pergunta rápida para ver se ficou claro?',
        ].join('\n'),
        pendingOffer: pendingOfferFromOptions(['check_understanding'], 'confirm'),
        topic: 'teaching',
      };
    case 'teaching_check':
      return {
        text: [
          'Ótimo. Pergunta rápida:',
          '',
          input.state.tutorConcept
            ? `Com suas palavras, o que acontece se o parâmetro principal ligado a **${input.state.tutorConcept}** estiver fora da faixa?`
            : 'Com suas palavras, qual é o primeiro cuidado prático desse conceito no campo?',
          '',
          'Responda do seu jeito — eu te ajudo a ajustar.',
        ].join('\n'),
        pendingOffer: null,
        topic: 'teaching',
      };
    case 'affirmation_orphan':
      return {
        text: 'Claro — sobre o que você gostaria de continuar? Posso falar de cursos, serviços do ecossistema ou indicar a empresa mais adequada.',
        pendingOffer: pendingOfferFromOptions(
          ['courses', 'services', 'company_recommendation'],
          'choice',
        ),
        topic: 'clarification',
      };
    default:
      return {
        text: '',
        pendingOffer: input.state.pendingOffer,
        topic: input.dialogueIntent,
      };
  }
}

function composeCourseCatalog(
  courses: PublicCourseFact[],
  state: ConversationState,
): { text: string; pendingOffer: PendingOffer | null; topic: string } {
  if (!courses.length) {
    return {
      text: 'No momento não encontrei cursos públicos publicados no catálogo. Posso orientar pelas áreas de formação do ecossistema (Fred do Frio / CTE) ou pelos serviços técnicos.',
      pendingOffer: pendingOfferFromOptions(['services', 'company_recommendation'], 'choice'),
      topic: 'course_catalog',
    };
  }
  const lines = courses.slice(0, 8).map((c) => {
    const level = humanizeLevel(c.level);
    const bits = [`**${c.title}**`];
    if (level) bits.push(`nível ${level}`);
    if (c.estimatedHours != null) bits.push(`cerca de ${c.estimatedHours}h`);
    const desc = c.shortDescription?.trim();
    return `- ${bits.join(' · ')}${desc ? ` — ${desc}` : ''}`;
  });
  const onlyOne = courses.length === 1;
  const text = naturalizeUserText(
    [
      onlyOne
        ? 'Atualmente temos publicado este curso no catálogo público da Omnia:'
        : 'Estes são os cursos públicos publicados agora na plataforma Omnia:',
      '',
      ...lines,
      '',
      'A formação no ecossistema é conduzida principalmente pelo Fred do Frio e pelo CTE.',
      '',
      onlyOne
        ? 'Se quiser, indico se esse curso combina com o seu momento (iniciante, quem já atua ou especialização).'
        : 'Se quiser, indico o mais adequado ao seu nível e objetivo.',
    ].join('\n'),
  );
  return {
    text,
    pendingOffer: pendingOfferFromOptions(['course_recommendation'], 'confirm'),
    topic: 'course_catalog',
  };
}

function composeCourseRecommendation(
  courses: PublicCourseFact[],
  state: ConversationState,
): { text: string; pendingOffer: PendingOffer | null; topic: string } {
  const level = state.userLevel;
  const pick =
    (level === 'beginner'
      ? courses.find((c) =>
          /beginner|fundament|inician|intro|b[aá]sic/i.test(
            `${c.level} ${c.title} ${c.shortDescription}`,
          ),
        )
      : null) ||
    courses.find((c) => /fundament/i.test(c.title)) ||
    courses[0] ||
    null;

  if (!pick) {
    return {
      text: 'Ainda não tenho um curso público publicado para recomendar com segurança. Posso te orientar sobre as empresas de formação (Fred do Frio / CTE) enquanto o catálogo evolui.',
      pendingOffer: pendingOfferFromOptions(['company_recommendation'], 'confirm'),
      topic: 'course_recommendation',
    };
  }

  const levelLabel = humanizeLevel(level) || humanizeLevel(pick.level) || 'o seu momento';
  const experienceBit =
    state.userExperienceYears != null
      ? `Com cerca de ${state.userExperienceYears} anos de experiência`
      : level === 'beginner'
        ? 'Para quem está começando'
        : level === 'advanced'
          ? 'Para quem busca especialização'
          : 'Para quem já atua na área';

  const interestBit =
    state.userInterest === 'commercial_refrigeration'
      ? ' e interesse em refrigeração comercial'
      : state.userInterest === 'industrial_refrigeration'
        ? ' e foco industrial'
        : '';

  const text = naturalizeUserText(
    [
      `${experienceBit}${interestBit}, a recomendação mais segura no catálogo público atual é **${pick.title}**.`,
      '',
      pick.shortDescription?.trim() ||
        'Ele consolida a base técnica necessária antes de avançar para temas mais específicos.',
      '',
      `Nível de referência: ${levelLabel}.`,
      '',
      'Se quiser, eu detalho o conteúdo ou te oriento sobre a empresa de formação (Fred do Frio / CTE).',
    ].join('\n'),
  );

  return {
    text,
    pendingOffer: pendingOfferFromOptions(['course_details', 'company_recommendation'], 'choice'),
    topic: 'course_recommendation',
  };
}

function composeServices(evidence: string[]): {
  text: string;
  pendingOffer: PendingOffer | null;
  topic: string;
} {
  const text = naturalizeUserText(
    [
      'A Omnia reúne diferentes empresas, então os serviços são distribuídos por especialidade — sem misturar tudo em um único “pacote genérico”.',
      '',
      '- **Renovação Refrigeração** — engenharia, projetos, instalação, comissionamento, manutenção e retrofit em refrigeração comercial e industrial.',
      '- **Fred do Frio / CTE** — formação e especialização profissional.',
      '- **Neurofrigo Command IA** — monitoramento, automação e IA aplicada à refrigeração.',
      '',
      evidence[0] ? `Com base no material público: ${evidence[0].slice(0, 220)}` : '',
      '',
      'Se você tiver um projeto (por exemplo câmara ou planta), posso indicar a empresa certa para o próximo passo.',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  return {
    text,
    pendingOffer: pendingOfferFromOptions(['company_recommendation', 'project_help'], 'choice'),
    topic: 'services',
  };
}

function composeCompanyRouting(state: ConversationState): {
  text: string;
  pendingOffer: PendingOffer | null;
  topic: string;
} {
  if (state.activeEntity === 'education' || /fred|cte|curso/i.test(state.selectedCompany || '')) {
    return {
      text: naturalizeUserText(
        [
          'Para cursos e formação, as empresas do ecossistema são o **Fred do Frio** (educação moderna) e o **CTE** (base técnica e normativa).',
          '',
          'Para execução de campo (projeto/instalação/manutenção), aí sim a referência é a **Renovação Refrigeração**.',
          '',
          'Quer ver os cursos públicos publicados agora?',
        ].join('\n'),
      ),
      pendingOffer: pendingOfferFromOptions(['courses'], 'confirm'),
      topic: 'company_routing',
    };
  }
  return {
    text: naturalizeUserText(
      [
        'Para serviços técnicos — projeto, instalação, manutenção ou câmara frigorífica — a empresa a procurar é a **Renovação Refrigeração**.',
        '',
        'Para formação: Fred do Frio / CTE. Para tecnologia e IA: Neurofrigo Command IA.',
        '',
        'Se quiser, descrevo o próximo passo típico para o seu cenário.',
      ].join('\n'),
    ),
    pendingOffer: pendingOfferFromOptions(['project_help', 'courses'], 'choice'),
    topic: 'company_routing',
  };
}

function composeInstitutional(evidence: string[]): {
  text: string;
  pendingOffer: PendingOffer | null;
  topic: string;
} {
  const hub =
    evidence.find((s) => /hub integrador/i.test(s)) ||
    'A Omnia Frigo Holding é o hub integrador do ecossistema de refrigeração que une tradição, educação e inteligência artificial aplicada.';
  const cleanHub = naturalizeUserText(
    hub.replace(/^Omnia Frigo Holding\s+/i, '').replace(/^A\s+A\s+/i, 'A '),
  );
  const lead = /omnia frigo holding/i.test(cleanHub)
    ? cleanHub.replace(/^.*?(A Omnia Frigo Holding é)/i, 'A Omnia Frigo Holding é')
    : 'A Omnia Frigo Holding é o hub integrador do ecossistema de refrigeração que une tradição, educação e inteligência artificial aplicada.';
  const text = [
    lead.startsWith('A Omnia') ? lead : `A Omnia Frigo Holding ${lead}`,
    '',
    'No ecossistema estão Renovação Refrigeração, Fred do Frio, CTE, Neurofrigo Command IA e Neurofrigo Carga.',
    '',
    'Posso detalhar cursos, serviços ou indicar a empresa mais adequada ao que você precisa.',
  ].join('\n');
  return {
    text: naturalizeUserText(text),
    pendingOffer: pendingOfferFromOptions(
      ['courses', 'services', 'company_recommendation'],
      'choice',
    ),
    topic: 'institutional_overview',
  };
}

function composeCommercial(state: ConversationState): {
  text: string;
  pendingOffer: PendingOffer | null;
  topic: string;
} {
  const stores = state.commercialContext?.storeCount;
  if (stores != null) {
    return {
      text: [
        `Perfeito — com **${stores} lojas**, já temos porte para qualificar a oportunidade.`,
        '',
        'Para avançar com segurança, me diga também: a prioridade é reduzir consumo de energia, aumentar confiabilidade das câmaras, ou modernizar a operação com monitoramento/IA?',
        '',
        'Com isso eu relaciono o cenário às soluções do ecossistema (Renovação + Neurofrigo) sem empurrar produto genérico.',
      ].join('\n'),
      pendingOffer: pendingOfferFromOptions(
        ['compare_options', 'company_recommendation'],
        'choice',
      ),
      topic: 'commercial_discovery',
    };
  }
  return {
    text: [
      'Entendi o objetivo de reduzir consumo de energia em supermercado.',
      '',
      'Antes de recomendar solução, preciso qualificar: quantas lojas/unidades estão no escopo e qual tecnologia atual de refrigeração?',
      '',
      'Pode responder de forma simples — por exemplo: “temos 3 lojas”.',
    ].join('\n'),
    pendingOffer: null,
    topic: 'commercial_discovery',
  };
}

function composeEngineering(state: ConversationState): {
  text: string;
  pendingOffer: PendingOffer | null;
  topic: string;
} {
  const suc = state.engineeringContext?.suctionPsi;
  const disc = state.engineeringContext?.dischargePsi;
  if (suc != null || disc != null) {
    return {
      text: [
        'Obrigado pelos dados — vou usar exatamente o que você informou no turno anterior.',
        '',
        suc != null ? `- Pressão de sucção: **${suc} psi**` : null,
        disc != null ? `- Condensação/descarga: **${disc} psi**` : null,
        '',
        'Com esses valores, o próximo passo é cruzar com a temperatura desejada da câmara e a condição operacional (carga, ventilação, descongelamento).',
        '',
        'Se puder, informe a temperatura de setpoint e a temperatura atual do ambiente refrigerado para eu avançar o diagnóstico sem inventar medição.',
      ]
        .filter(Boolean)
        .join('\n'),
      pendingOffer: pendingOfferFromOptions(['continue_diagnosis'], 'confirm'),
      topic: 'engineering_troubleshooting',
    };
  }
  return {
    text: [
      state.engineeringContext?.symptom ||
        'Entendi o sintoma de a câmara não atingir a temperatura.',
      '',
      'Para avançar no diagnóstico com segurança, preciso de:',
      '- pressão de sucção',
      '- pressão de descarga/condensação',
      '- temperatura desejada e atual',
      '- condição operacional (carga, ciclo, alarmes)',
      '',
      'Pode enviar no formato: “Sucção 32 psi e condensação 220 psi”.',
    ].join('\n'),
    pendingOffer: pendingOfferFromOptions(['continue_diagnosis'], 'question'),
    topic: 'engineering_troubleshooting',
  };
}
