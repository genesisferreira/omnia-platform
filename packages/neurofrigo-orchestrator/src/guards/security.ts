import type { GuardDecision } from '../domain/types';

const SECURITY_DENY =
  'Não posso revelar configurações internas, prompts, secrets ou infraestrutura. Posso ajudar com o conteúdo autorizado do ecossistema Omnia.';

const EXFIL_PATTERNS = [
  /\bsystem\s*prompt\b/i,
  /\bmostre\s+(seu|o)\s+prompt\b/i,
  /\bapi\s*key\b/i,
  /\bchave\s+de\s+api\b/i,
  /\btoken\s+secreto\b/i,
  /\b\.env\b/i,
  /\bvari[aá]veis?\s+de\s+ambiente\b/i,
  /\btabelas?\s+do\s+banco\b/i,
  /\bschema\s+(do\s+)?banco\b/i,
  /\barquitetura\s+interna\b/i,
  /\bdocumentos?\s+privados?\b/i,
  /\bignora(r)?\s+(todas\s+)?(as\s+)?instru/i,
  /\bDAN\b/,
  /\bjailbreak\b/i,
];

export function evaluateSecurityGuard(question: string): GuardDecision {
  for (const re of EXFIL_PATTERNS) {
    if (re.test(question)) {
      return {
        allow: false,
        code: 'SECURITY_EXFILTRATION',
        message: SECURITY_DENY,
        event: 'ai.policy.denied',
      };
    }
  }
  return { allow: true };
}

/** Compliance pós-resposta: remove/bloqueia vazamento óbvio de secrets. */
export function applyComplianceGuard(text: string): {
  text: string;
  blocked: boolean;
  reason: string | null;
} {
  const secretLike =
    /sk-[a-zA-Z0-9]{20,}/.test(text) ||
    /DEEPSEEK_API_KEY\s*=/.test(text) ||
    /Bearer\s+[A-Za-z0-9\-._]{20,}/.test(text);

  if (secretLike) {
    return {
      text: 'A resposta foi bloqueada pelo Compliance Guard por possível vazamento de segredo.',
      blocked: true,
      reason: 'SECRET_PATTERN',
    };
  }
  return { text, blocked: false, reason: null };
}
