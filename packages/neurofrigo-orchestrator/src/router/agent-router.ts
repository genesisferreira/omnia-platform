import type {
  OfficialSpecialistKey,
  OrchestratorIntent,
  ProfileKind,
  RoutedAgent,
} from '../domain/types';

const DISPLAY: Record<string, string> = {
  hvac: 'Refrigeração',
  'neurofrigo-tech': 'Tecnologia Neurofrigo',
  electrical: 'Elétrica e Comandos',
  assessor: 'Avaliador',
  tutor: 'Tutor',
  radar: 'Radar Tecnológico',
  lab: 'Projetos e Laboratório',
  content: 'Produção de Conteúdo',
  commercial: 'Comercial',
  support: 'Suporte',
  engineering: 'Engenharia',
  command: 'Command',
};

const INTENT_TO_AGENT: Record<OrchestratorIntent, OfficialSpecialistKey | 'commercial' | 'support' | 'content'> = {
  institutional: 'content',
  courses: 'tutor',
  enrollment: 'support',
  academic: 'tutor',
  refrigeration: 'hvac',
  neurofrigo_tech: 'neurofrigo-tech',
  electrical: 'electrical',
  assessment: 'assessor',
  tutoring: 'tutor',
  radar: 'radar',
  lab: 'lab',
  content_production: 'content',
  engineering_services: 'hvac',
  commercial: 'commercial',
  partnership: 'commercial',
  support: 'support',
  human_handoff: 'support',
  general: 'tutor',
};

/**
 * Agent Router — escolhe especialista da allowlist da superfície Portal.
 * Command nunca é roteado aqui.
 */
export function routePortalAgent(input: {
  intent: OrchestratorIntent;
  profile: ProfileKind;
  allowedAssistantKeys: string[];
  preferredAssistantKey?: string | null;
  enrolled: boolean;
}): RoutedAgent {
  if (input.preferredAssistantKey && input.preferredAssistantKey !== 'auto') {
    const key = input.preferredAssistantKey;
    if (key === 'command' && input.profile !== 'super_admin') {
      return fallbackAllowed(input.allowedAssistantKeys, 'tutor', input.intent, 'command_denied');
    }
    if (input.allowedAssistantKeys.includes(key)) {
      return {
        assistantKey: key,
        displayName: DISPLAY[key] || key,
        intent: input.intent,
        reason: 'user_selected',
      };
    }
  }

  let key = INTENT_TO_AGENT[input.intent] || 'tutor';

  // Aluno sem matrícula não usa tutor de conteúdo interno → support/content institucional
  if (
    input.profile === 'student' &&
    !input.enrolled &&
    (key === 'tutor' || key === 'hvac' || key === 'electrical' || key === 'neurofrigo-tech' || key === 'lab')
  ) {
    key = 'support';
  }

  // Avaliador: alunos vão para tutor (integrity já bloqueia gabarito)
  if (key === 'assessor' && input.profile === 'student') {
    key = 'tutor';
  }

  // Visitante: evita assessor/lab profundo
  if (input.profile === 'visitor' && (key === 'assessor' || key === 'lab')) {
    key = 'content';
  }

  return fallbackAllowed(input.allowedAssistantKeys, key, input.intent, 'intent_route');
}

function fallbackAllowed(
  allowed: string[],
  desired: string,
  intent: OrchestratorIntent,
  reason: string,
): RoutedAgent {
  const key =
    (allowed.includes(desired) && desired) ||
    (allowed.includes('tutor') && 'tutor') ||
    (allowed.includes('support') && 'support') ||
    allowed[0] ||
    'tutor';
  return {
    assistantKey: key,
    displayName: DISPLAY[key] || key,
    intent,
    reason: allowed.includes(desired) ? reason : `${reason}_fallback`,
  };
}
