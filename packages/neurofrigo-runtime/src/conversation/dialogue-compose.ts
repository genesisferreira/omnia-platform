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
    case 'contact_handoff':
      if (input.state.handoffPrepared || input.state.pendingConfirmation === 'handoff_done') {
        return composeHandoffConfirm(input.state);
      }
      return composeContact(input.state);
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
  const experienceYears = state.experienceYears ?? state.userExperienceYears;
  const experienceLevel = state.experienceLevel || state.userLevel;
  const area = state.technicalArea || state.userInterest;
  const goal = state.userGoal || state.conversationGoal || state.interestArea;

  // Progressive qualification — one useful question at a time; never ask what we know.
  if (experienceYears == null && !experienceLevel) {
    return {
      text: naturalizeUserText(
        'Posso indicar com mais precisão. Você já trabalha com refrigeração ou está começando?',
      ),
      pendingOffer: pendingOfferFromOptions(['course_recommendation'], 'question'),
      topic: 'course_recommendation',
    };
  }
  if (!area) {
    return {
      text: naturalizeUserText(
        experienceYears != null
          ? `Ótimo — com cerca de ${experienceYears} anos de experiência. Em qual área você atua mais hoje: comercial, industrial ou climatização?`
          : 'Em qual área você atua mais hoje: comercial, industrial ou climatização?',
      ),
      pendingOffer: pendingOfferFromOptions(['course_recommendation'], 'question'),
      topic: 'course_recommendation',
    };
  }
  if (!goal) {
    return {
      text: naturalizeUserText(
        'E o que você quer desenvolver agora — migrar para industrial, aprofundar manutenção, projetos, automação/IA ou outra área?',
      ),
      pendingOffer: pendingOfferFromOptions(['course_recommendation'], 'question'),
      topic: 'course_recommendation',
    };
  }

  const pick = courses[0] || null;
  if (!pick) {
    return {
      text: naturalizeUserText(
        'Ainda não há um curso público publicado que eu possa recomendar com segurança para esse objetivo. O ecossistema tem capacidade de formação via Fred do Frio / CTE — quer que eu prepare o encaminhamento para a área de educação?',
      ),
      pendingOffer: pendingOfferFromOptions(
        ['contact_handoff', 'company_recommendation'],
        'choice',
      ),
      topic: 'course_recommendation',
    };
  }

  const catalogLevel = humanizeLevel(pick.level) || 'conforme o catálogo';
  const isIntro = /beginner|inician|intro|b[aá]sic|fundament/i.test(
    `${pick.level || ''} ${pick.title}`,
  );
  const experienced =
    (experienceYears != null && experienceYears >= 3) ||
    experienceLevel === 'intermediate' ||
    experienceLevel === 'advanced';

  // CRITICAL: never mutate catalog metadata (beginner ≠ intermediate).
  let text: string;
  if (experienced && isIntro) {
    text = [
      `Hoje o catálogo público mostra **${pick.title}** (nível ${catalogLevel} no LMS).`,
      '',
      experienceYears != null
        ? `Como você já tem cerca de ${experienceYears} anos de experiência${area ? ` em ${humanArea(area)}` : ''}, ele pode ficar básico para o seu perfil.`
        : `Para o seu perfil, ele pode ficar básico.`,
      '',
      goal
        ? `Seu objetivo (${humanGoal(goal)}) pede algo mais específico do que a oferta publicada agora.`
        : 'Antes de empurrar uma recomendação inadequada, prefiro ser transparente.',
      '',
      'Posso (1) detalhar o que esse curso cobre, (2) indicar a empresa de formação do ecossistema, ou (3) preparar um contato com a área responsável.',
    ].join('\n');
  } else {
    text = [
      `No catálogo público atual, a referência publicada é **${pick.title}** (nível ${catalogLevel}).`,
      '',
      pick.shortDescription?.trim() ||
        'Ele consolida a base técnica necessária antes de avançar para temas mais específicos.',
      '',
      'Se quiser, detalho o conteúdo ou preparo o contato com Fred do Frio / CTE.',
    ].join('\n');
  }

  return {
    text: naturalizeUserText(text),
    pendingOffer: pendingOfferFromOptions(
      ['course_details', 'company_recommendation', 'contact_handoff'],
      'choice',
    ),
    topic: 'course_recommendation',
  };
}

function humanArea(area: string): string {
  if (/commercial/i.test(area)) return 'refrigeração comercial';
  if (/industrial/i.test(area)) return 'refrigeração industrial';
  if (/hvac|climat/i.test(area)) return 'climatização';
  return area;
}

function humanGoal(goal: string): string {
  if (/industrial/i.test(goal)) return 'migrar / atuar em industrial';
  if (/energy/i.test(goal)) return 'reduzir consumo de energia';
  return goal.replace(/_/g, ' ');
}

function composeContact(state: ConversationState): {
  text: string;
  pendingOffer: PendingOffer | null;
  topic: string;
} {
  const target =
    state.contactTarget ||
    state.responsibleCompany ||
    (/curso|forma[cç]|educa|fred|cte/i.test(
      `${state.currentIntent} ${state.activeEntity} ${state.selectedCourse}`,
    )
      ? 'education'
      : state.currentIntent === 'commercial_discovery' || state.commercialContext?.storeCount
        ? 'commercial'
        : state.currentIntent === 'engineering_troubleshooting' || state.engineeringContext?.symptom
          ? 'technical'
          : 'general');

  const label =
    target === 'education' || /fred|cte|educa/i.test(String(target))
      ? 'Fred do Frio / CTE (formação)'
      : target === 'technical' || /renova/i.test(String(target))
        ? 'Renovação Refrigeração (serviços técnicos)'
        : target === 'commercial'
          ? 'equipe comercial do ecossistema Omnia'
          : 'área responsável do ecossistema Omnia';

  const facts = [];
  const years = state.experienceYears ?? state.userExperienceYears;
  if (years != null) facts.push(`${years} anos de experiência`);
  if (state.technicalArea) facts.push(humanArea(state.technicalArea));
  if (state.userGoal) facts.push(humanGoal(state.userGoal));
  if (state.commercialContext?.numberOfUnits || state.commercialContext?.storeCount) {
    facts.push(
      `${state.commercialContext?.numberOfUnits || state.commercialContext?.storeCount} lojas`,
    );
  }

  const summary = facts.length ? `Já tenho este contexto: ${facts.join('; ')}.` : '';

  return {
    text: naturalizeUserText(
      [
        summary,
        `Posso preparar o encaminhamento para **${label}**.`,
        '',
        'Confirma que quer que eu registre esse interesse para a equipe responsável?',
        '',
        'Obs.: o CRM ainda não envia automaticamente; se confirmar, deixo o pedido estruturado e indico o canal oficial disponível enquanto a automação não está ligada.',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    pendingOffer: pendingOfferFromOptions(['confirm_handoff'], 'confirm'),
    topic: 'contact_handoff',
  };
}

function composeHandoffConfirm(state: ConversationState): {
  text: string;
  pendingOffer: PendingOffer | null;
  topic: string;
} {
  const target = state.responsibleCompany || state.contactTarget || 'área responsável';
  return {
    text: naturalizeUserText(
      [
        'Perfeito — registrei sua confirmação.',
        '',
        `Destino: **${target === 'education' ? 'Fred do Frio / CTE' : target === 'technical' ? 'Renovação Refrigeração' : target}**.`,
        state.knownUserFacts?.length
          ? `Contexto levado: ${state.knownUserFacts.slice(-6).join('; ')}.`
          : null,
        '',
        'Enquanto o CRM não está integrado, o próximo passo oficial é falar com a equipe Omnia pelo canal do portal/área correspondente. Se quiser, me diga só o melhor meio de retorno (e-mail ou WhatsApp) para eu anexar ao pedido.',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    pendingOffer: null,
    topic: 'contact_handoff',
  };
}

function composeServices(evidence: string[]): {
  text: string;
  pendingOffer: PendingOffer | null;
  topic: string;
} {
  void evidence;
  const text = naturalizeUserText(
    [
      'A Omnia reúne diferentes empresas, então os serviços são distribuídos por especialidade.',
      '',
      '- **Renovação Refrigeração** — engenharia, projetos, instalação, comissionamento, manutenção e retrofit.',
      '- **Fred do Frio / CTE** — formação e especialização profissional.',
      '- **Neurofrigo Command IA** — monitoramento, automação e IA aplicada à refrigeração.',
      '',
      'Se você tiver um projeto (por exemplo uma câmara), posso indicar a empresa certa ou preparar um contato.',
    ].join('\n'),
  );
  return {
    text,
    pendingOffer: pendingOfferFromOptions(
      ['company_recommendation', 'project_help', 'contact_handoff'],
      'choice',
    ),
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
  const text = [
    'A Omnia Frigo Holding integra as diferentes frentes do ecossistema Omnia na refrigeração. Ela conecta educação técnica, engenharia e serviços, tecnologia e inteligência artificial para atender profissionais e empresas em diferentes necessidades.',
    '',
    'Entre as frentes do grupo estão Renovação Refrigeração, Fred do Frio, CTE e Neurofrigo.',
    '',
    'Se você me disser o que procura — formação, serviço técnico ou tecnologia — posso te direcionar.',
  ].join('\n');
  // evidence is available for grounding checks but not dumped
  void evidence;
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
  const stores = state.commercialContext?.numberOfUnits ?? state.commercialContext?.storeCount;
  const hasRooms = state.commercialContext?.hasColdRooms;
  const pain = state.commercialContext?.pain || state.commercialContext?.goal;

  if (stores != null && hasRooms && pain) {
    return {
      text: [
        `Já tenho o cenário: **${stores} lojas**, todas com câmara fria, e o problema de energia/custo.`,
        '',
        'Um bom ponto de partida é mapear as câmaras de maior consumo e cruzar com regime de operação — a Renovação atua no técnico e a Neurofrigo no monitoramento/IA.',
        '',
        'Quer que eu prepare o encaminhamento para a equipe responsável?',
      ].join('\n'),
      pendingOffer: pendingOfferFromOptions(['contact_handoff', 'compare_options'], 'choice'),
      topic: 'commercial_discovery',
    };
  }
  if (stores != null && hasRooms == null) {
    return {
      text: [
        `Perfeito — com **${stores} lojas**, já temos porte para qualificar.`,
        '',
        'Todas têm câmara fria?',
      ].join('\n'),
      pendingOffer: null,
      topic: 'commercial_discovery',
    };
  }
  if (stores != null) {
    return {
      text: [
        `Perfeito — com **${stores} lojas**, já temos porte para qualificar a oportunidade.`,
        '',
        'A prioridade é reduzir consumo de energia, aumentar confiabilidade das câmaras, ou modernizar com monitoramento/IA?',
      ].join('\n'),
      pendingOffer: pendingOfferFromOptions(['compare_options', 'contact_handoff'], 'choice'),
      topic: 'commercial_discovery',
    };
  }
  if (/energy|consumo|energia/i.test(String(pain || state.userGoal || ''))) {
    return {
      text: [
        'Entendi o objetivo de reduzir consumo de energia.',
        '',
        'É uma única instalação ou vocês têm mais unidades/lojas?',
      ].join('\n'),
      pendingOffer: null,
      topic: 'commercial_discovery',
    };
  }
  return {
    text: [
      'Entendi. Para eu direcionar melhor o time certo:',
      '',
      'O foco é reduzir consumo de energia, resolver um problema em câmara/instalação, ou avaliar modernização com monitoramento/IA?',
    ].join('\n'),
    pendingOffer: pendingOfferFromOptions(['compare_options', 'contact_handoff'], 'choice'),
    topic: 'commercial_discovery',
  };
}

function composeEngineering(state: ConversationState): {
  text: string;
  pendingOffer: PendingOffer | null;
  topic: string;
} {
  const eng = state.engineeringContext || {};
  const hasCore =
    eng.setpointC != null &&
    eng.actualTempC != null &&
    eng.suctionPsi != null &&
    eng.dischargePsi != null;

  if (eng.nextStep === 'after_first' || state.pendingQuestion === 'eng_next') {
    return {
      text: [
        'Em seguida, sem inventar medição:',
        '- confira se a carga térmica / porta aberta explica o gap de temperatura;',
        '- valide descongelamento e ventilação do evaporador;',
        '- compare a relação sucção/descarga com o regime esperado do fluido informado.',
        '',
        eng.refrigerant ? `Fluido em uso no contexto: **${eng.refrigerant}**.` : null,
        '',
        'Se puder, descreva se há alarme, gelo no evaporador ou ruído anormal no compressor.',
      ]
        .filter(Boolean)
        .join('\n'),
      pendingOffer: pendingOfferFromOptions(['continue_diagnosis'], 'confirm'),
      topic: 'engineering_troubleshooting',
    };
  }

  if (hasCore) {
    return {
      text: [
        'Com o que você já passou, estou trabalhando com:',
        eng.setpointC != null ? `- setpoint: **${eng.setpointC}°C**` : null,
        eng.actualTempC != null ? `- temperatura atual: **${eng.actualTempC}°C**` : null,
        eng.refrigerant ? `- fluido: **${eng.refrigerant}**` : null,
        eng.suctionPsi != null ? `- sucção: **${eng.suctionPsi} psi**` : null,
        eng.dischargePsi != null ? `- descarga: **${eng.dischargePsi} psi**` : null,
        '',
        'Primeiro: confirme se o evaporador está trocando calor (gelo excessivo, ventilação, fluxo de ar) — o gap entre setpoint e temperatura atual sugere capacidade insuficiente ou troca prejudicada, não um número inventado.',
        '',
        'Quer o próximo passo (“e depois”)?',
      ]
        .filter(Boolean)
        .join('\n'),
      pendingOffer: pendingOfferFromOptions(['continue_diagnosis'], 'confirm'),
      topic: 'engineering_troubleshooting',
    };
  }

  const missing: string[] = [];
  if (eng.setpointC == null) missing.push('temperatura desejada (setpoint)');
  if (eng.actualTempC == null) missing.push('temperatura atual');
  if (eng.refrigerant == null) missing.push('fluido refrigerante');
  if (eng.suctionPsi == null) missing.push('pressão de sucção');
  if (eng.dischargePsi == null) missing.push('pressão de descarga');

  if (missing.length && missing.length < 5) {
    return {
      text: [
        'Vou avançar só com o que falta — sem pedir de novo o que você já deu.',
        '',
        eng.suctionPsi != null ? `- sucção já informada: **${eng.suctionPsi} psi**` : null,
        eng.dischargePsi != null ? `- descarga já informada: **${eng.dischargePsi} psi**` : null,
        eng.setpointC != null ? `- setpoint: **${eng.setpointC}°C**` : null,
        eng.actualTempC != null ? `- temperatura atual: **${eng.actualTempC}°C**` : null,
        eng.refrigerant ? `- fluido: **${eng.refrigerant}**` : null,
        '',
        `Ainda preciso de: ${missing.join(', ')}.`,
      ]
        .filter(Boolean)
        .join('\n'),
      pendingOffer: pendingOfferFromOptions(['continue_diagnosis'], 'question'),
      topic: 'engineering_troubleshooting',
    };
  }

  // Early technical discovery when almost no measurements yet (Concierge-safe routing).
  if (
    missing.length >= 4 &&
    (eng.equipment || /c[aâ]mara|temperatura/i.test(String(eng.symptom || '')))
  ) {
    const notReaching = /n[aã]o chega|n[aã]o atinge|fora de temperatura/i.test(
      String(eng.symptom || ''),
    );
    if (notReaching) {
      return {
        text: [
          'Anotei o sintoma: a câmara **não chega na temperatura**.',
          '',
          'No Concierge eu faço a descoberta e o encaminhamento — sem substituir o diagnóstico de engenharia.',
          'A referência técnica no ecossistema é a **Renovação Refrigeração**.',
          '',
          'Quer que eu prepare o contato com a equipe técnica agora?',
        ].join('\n'),
        pendingOffer: pendingOfferFromOptions(['contact_handoff', 'continue_diagnosis'], 'choice'),
        topic: 'engineering_troubleshooting',
      };
    }
    return {
      text: [
        'Entendi que você tem uma câmara fria no cenário.',
        '',
        'Posso te direcionar à **Renovação Refrigeração** para atendimento técnico.',
        'O que acontece com ela — não chega na temperatura, oscila, ou você quer serviço/projeto?',
      ].join('\n'),
      pendingOffer: pendingOfferFromOptions(['contact_handoff', 'continue_diagnosis'], 'choice'),
      topic: 'engineering_troubleshooting',
    };
  }

  return {
    text: [
      eng.symptom || 'Entendi o sintoma na câmara.',
      '',
      'Para um diagnóstico seguro, me passe setpoint, temperatura atual, fluido e pressões de sucção/descarga quando puder.',
    ].join('\n'),
    pendingOffer: pendingOfferFromOptions(['continue_diagnosis'], 'question'),
    topic: 'engineering_troubleshooting',
  };
}
