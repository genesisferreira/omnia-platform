'use client';

import { useState, type FormEvent } from 'react';

import {
  CONTACT_MESSAGE_LIMITS,
  CONTACT_SUBJECTS,
  OMNIA_CONTACT_EMAIL,
  validateContactMessage,
  type ContactField,
} from '@omnia/shared';
import { Button, Input } from '@omnia/ui';

import { getPublicAdminUrl } from '@/lib/auth/admin-url';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function ContactForm() {
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<ContactField | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [website, setWebsite] = useState('');

  function fail(message: string, field: ContactField | null = null) {
    setError(message);
    setErrorField(field);
    setState('error');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setErrorField(null);

    const validated = validateContactMessage({ nome, email, assunto, mensagem });
    if (!validated.ok) {
      fail(validated.error, validated.field === 'body' ? null : validated.field);
      return;
    }

    setState('submitting');
    try {
      const response = await fetch(`${getPublicAdminUrl()}/api/omnia/contact-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ ...validated.data, website }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: { message?: string; field?: ContactField };
      } | null;

      if (!response.ok || !payload?.ok) {
        fail(
          payload?.error?.message ??
            'Não foi possível enviar sua mensagem agora. Fale conosco pelo WhatsApp ou por e-mail.',
          payload?.error?.field ?? null,
        );
        return;
      }
      setState('success');
    } catch {
      fail('Serviço temporariamente indisponível. Fale conosco pelo WhatsApp ou por e-mail.');
    }
  }

  if (state === 'success') {
    return (
      <div
        className="rounded-2xl border border-omnia-emerald/30 bg-omnia-white/95 p-8 shadow-lg"
        role="status"
      >
        <p className="font-heading text-2xl font-semibold text-omnia-deep-blue">
          Mensagem enviada!
        </p>
        <p className="mt-3 text-omnia-graphite-light">
          Obrigado pelo contato. Nossa equipe responderá pelo e-mail informado.
        </p>
      </div>
    );
  }

  const pending = state === 'submitting';
  const invalid = (field: ContactField) => (errorField === field ? true : undefined);
  const edit = (field: ContactField, set: (value: string) => void) => (value: string) => {
    if (errorField === field) setErrorField(null);
    set(value);
  };

  return (
    <form
      className="relative space-y-5 rounded-2xl border border-omnia-deep-blue/10 bg-omnia-white/95 p-6 shadow-lg md:p-8"
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="contact-form-title"
    >
      <div>
        <h3
          id="contact-form-title"
          className="font-heading text-2xl font-semibold text-omnia-deep-blue"
        >
          Envie uma mensagem
        </h3>
        <p className="mt-1 text-sm text-omnia-graphite-light">Campos com * são obrigatórios.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="contato-nome" className="text-sm font-medium">
            Nome *
          </label>
          <Input
            id="contato-nome"
            name="nome"
            autoComplete="name"
            required
            maxLength={CONTACT_MESSAGE_LIMITS.nameMax}
            aria-invalid={invalid('nome')}
            value={nome}
            onChange={(event) => edit('nome', setNome)(event.target.value)}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="contato-email" className="text-sm font-medium">
            E-mail *
          </label>
          <Input
            id="contato-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={CONTACT_MESSAGE_LIMITS.emailMax}
            aria-invalid={invalid('email')}
            value={email}
            onChange={(event) => edit('email', setEmail)(event.target.value)}
            disabled={pending}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="contato-assunto" className="text-sm font-medium">
            Assunto *
          </label>
          <select
            id="contato-assunto"
            name="assunto"
            required
            aria-invalid={invalid('assunto')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={assunto}
            onChange={(event) => edit('assunto', setAssunto)(event.target.value)}
            disabled={pending}
          >
            <option value="">Selecione</option>
            {CONTACT_SUBJECTS.map((subject) => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="contato-mensagem" className="text-sm font-medium">
            Mensagem *
          </label>
          <textarea
            id="contato-mensagem"
            name="mensagem"
            rows={5}
            required
            maxLength={CONTACT_MESSAGE_LIMITS.messageMax}
            aria-invalid={invalid('mensagem')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={mensagem}
            onChange={(event) => edit('mensagem', setMensagem)(event.target.value)}
            disabled={pending}
          />
        </div>
      </div>

      {/* Honeypot — oculto de usuários reais */}
      <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="contato-website">Website</label>
        <input
          id="contato-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <p className="text-xs leading-relaxed text-omnia-graphite-light">
        Seus dados são usados apenas para responder a esta mensagem e são encaminhados à equipe pelo
        e-mail {OMNIA_CONTACT_EMAIL}; não ficam armazenados no site.
      </p>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar mensagem'}
      </Button>
    </form>
  );
}
