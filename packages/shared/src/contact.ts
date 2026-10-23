/**
 * Canais oficiais de contato da Omnia Frigo Holding e contrato do formulário público de /contato.
 * Validação pura (sem I/O): usada pelo Portal (feedback imediato) e pelo Admin (fonte da verdade).
 */

export const OMNIA_CONTACT_WHATSAPP_DISPLAY = '(31) 2888-0650';
export const OMNIA_CONTACT_WHATSAPP_E164 = '553128880650';
export const OMNIA_CONTACT_WHATSAPP_MESSAGE =
  'Olá! Vim pelo site da Omnia Frigo Holding e gostaria de mais informações.';
export const OMNIA_CONTACT_EMAIL = 'contato@omniafrigoholding.com.br';

export function buildOmniaWhatsappUrl(message: string = OMNIA_CONTACT_WHATSAPP_MESSAGE): string {
  return `https://wa.me/${OMNIA_CONTACT_WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}

export const CONTACT_SUBJECTS = [
  { value: 'refrigeracao-engenharia', label: 'Refrigeração e engenharia' },
  { value: 'cursos-formacao', label: 'Cursos e formação técnica' },
  { value: 'automacao-ia', label: 'Automação e IA' },
  { value: 'parcerias-negocios', label: 'Parcerias e negócios' },
  { value: 'outros', label: 'Outros' },
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number]['value'];

export const CONTACT_MESSAGE_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  emailMax: 254,
  messageMin: 10,
  messageMax: 4000,
  bodyMaxBytes: 8192,
} as const;

export type ContactMessageInput = {
  nome: string;
  email: string;
  assunto: ContactSubject;
  mensagem: string;
};

export type ContactField = 'nome' | 'email' | 'assunto' | 'mensagem';

export type ContactValidation =
  | { ok: true; data: ContactMessageInput }
  | { ok: false; field: ContactField | 'body'; error: string };

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
// Controle (inclui CR/LF) fora de nome/e-mail impede injeção de cabeçalho de e-mail.
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/g;
// eslint-disable-next-line no-control-regex
const MESSAGE_CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function contactSubjectLabel(value: string): string {
  return CONTACT_SUBJECTS.find((subject) => subject.value === value)?.label ?? 'Outros';
}

export function validateContactMessage(raw: unknown): ContactValidation {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, field: 'body', error: 'Corpo da requisição inválido.' };
  }
  const body = raw as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === 'string' ? value : '');

  const nome = str(body.nome).replace(CONTROL_RE, ' ').replace(/\s+/g, ' ').trim();
  if (
    nome.length < CONTACT_MESSAGE_LIMITS.nameMin ||
    nome.length > CONTACT_MESSAGE_LIMITS.nameMax
  ) {
    return { ok: false, field: 'nome', error: 'Informe seu nome.' };
  }

  const email = str(body.email).replace(CONTROL_RE, '').trim().toLowerCase();
  if (email.length > CONTACT_MESSAGE_LIMITS.emailMax || !EMAIL_RE.test(email)) {
    return { ok: false, field: 'email', error: 'Informe um e-mail válido.' };
  }

  const assunto = str(body.assunto);
  if (!CONTACT_SUBJECTS.some((subject) => subject.value === assunto)) {
    return { ok: false, field: 'assunto', error: 'Selecione o assunto.' };
  }

  const mensagem = str(body.mensagem)
    .replace(/\r\n?/g, '\n')
    .replace(MESSAGE_CONTROL_RE, '')
    .trim();
  if (mensagem.length < CONTACT_MESSAGE_LIMITS.messageMin) {
    return {
      ok: false,
      field: 'mensagem',
      error: 'Escreva sua mensagem (mínimo de 10 caracteres).',
    };
  }
  if (mensagem.length > CONTACT_MESSAGE_LIMITS.messageMax) {
    return {
      ok: false,
      field: 'mensagem',
      error: 'Mensagem muito longa (máximo de 4.000 caracteres).',
    };
  }

  return { ok: true, data: { nome, email, assunto: assunto as ContactSubject, mensagem } };
}
