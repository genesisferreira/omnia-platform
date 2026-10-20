'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { LEAD_INTEREST_AREAS } from '@omnia/constants';
import { Button, Input } from '@omnia/ui';

import { getPublicAdminUrl } from '@/lib/auth/admin-url';

export type PublicOrgOption = {
  id: string;
  name: string;
  slug: string;
};

type FormState = 'idle' | 'filling' | 'validating' | 'submitting' | 'success' | 'error';

type LeadCaptureFormProps = {
  organizations: PublicOrgOption[];
  initialQuery: Record<string, string | undefined>;
};

function track(event: string, detail?: Record<string, string>) {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent('omnia:analytics', { detail: { event, ...detail } }));
}

function readQueryDefaults(initialQuery: Record<string, string | undefined>) {
  const areaFromProduto = initialQuery.produto?.trim();
  const matchedArea = LEAD_INTEREST_AREAS.find(
    (entry) =>
      entry.value === areaFromProduto ||
      entry.value.includes(areaFromProduto || '___') ||
      entry.label.toLowerCase().includes((areaFromProduto || '').toLowerCase()),
  );

  return {
    areaInteresse: matchedArea?.value ?? '',
    organizationSlug: initialQuery.empresa?.trim() ?? '',
    utm_source: initialQuery.utm_source || initialQuery.origem || '',
    utm_medium: initialQuery.utm_medium || '',
    utm_campaign: initialQuery.utm_campaign || '',
    utm_content: initialQuery.utm_content || '',
    utm_term: initialQuery.utm_term || '',
    gclid: initialQuery.gclid || '',
    fbclid: initialQuery.fbclid || '',
  };
}

export function LeadCaptureForm({ organizations, initialQuery }: LeadCaptureFormProps) {
  const defaults = useMemo(() => readQueryDefaults(initialQuery), [initialQuery]);
  const orgFromSlug = organizations.find((org) => org.slug === defaults.organizationSlug);

  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [areaInteresse, setAreaInteresse] = useState(defaults.areaInteresse);
  const [empresa, setEmpresa] = useState('');
  const [cargo, setCargo] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [organizationInteresse, setOrganizationInteresse] = useState(orgFromSlug?.id ?? '');
  const [mensagem, setMensagem] = useState('');
  const [aceitePrivacidade, setAceitePrivacidade] = useState(false);
  const [website, setWebsite] = useState('');

  useEffect(() => {
    track('lead_form_view');
  }, []);

  function markFilling() {
    if (state === 'idle') {
      setState('filling');
      track('lead_form_start');
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setState('validating');

    if (!nome.trim() || !email.trim() || !whatsapp.trim() || !areaInteresse) {
      setError('Preencha os campos obrigatórios.');
      setState('error');
      return;
    }

    if (!aceitePrivacidade) {
      setError('É necessário aceitar o uso dos dados para contato comercial.');
      setState('error');
      return;
    }

    setState('submitting');
    track('lead_form_submit');

    try {
      const endpoint = `${getPublicAdminUrl()}/api/omnia/lead-capture`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          nome,
          email,
          whatsapp,
          areaInteresse,
          aceitePrivacidade,
          empresa: empresa || undefined,
          cargo: cargo || undefined,
          cidade: cidade || undefined,
          estado: estado || undefined,
          organizationInteresse: organizationInteresse || undefined,
          mensagem: mensagem || undefined,
          website,
          utm_source: defaults.utm_source || undefined,
          utm_medium: defaults.utm_medium || undefined,
          utm_campaign: defaults.utm_campaign || undefined,
          utm_content: defaults.utm_content || undefined,
          utm_term: defaults.utm_term || undefined,
          gclid: defaults.gclid || undefined,
          fbclid: defaults.fbclid || undefined,
          referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
          landingPath: '/interesse',
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        error?: { message?: string };
      } | null;

      if (response.status === 429) {
        setError(payload?.error?.message ?? 'Muitas tentativas. Aguarde e tente novamente.');
        setState('error');
        track('lead_form_error', { code: '429' });
        return;
      }

      if (!response.ok || !payload?.ok) {
        setError(
          payload?.error?.message ?? 'Não foi possível enviar agora. Tente novamente em instantes.',
        );
        setState('error');
        track('lead_form_error', { code: String(response.status) });
        return;
      }

      setState('success');
      track('lead_form_success');
    } catch {
      setError('Serviço temporariamente indisponível. Tente novamente.');
      setState('error');
      track('lead_form_error', { code: 'network' });
    }
  }

  if (state === 'success') {
    return (
      <div
        className="rounded-2xl border border-omnia-emerald/30 bg-omnia-white/95 p-8 shadow-lg"
        role="status"
      >
        <p className="font-heading text-2xl font-semibold text-omnia-deep-blue">Obrigado!</p>
        <p className="mt-3 text-omnia-graphite-light">
          Recebemos seu interesse. Nossa equipe comercial entrará em contato pelo e-mail ou WhatsApp
          informados. Nenhum login foi criado nesta etapa.
        </p>
      </div>
    );
  }

  const pending = state === 'submitting';

  return (
    <form
      className="relative space-y-5 rounded-2xl border border-omnia-deep-blue/10 bg-omnia-white/95 p-6 shadow-lg md:p-8"
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="lead-form-title"
    >
      <div>
        <h2
          id="lead-form-title"
          className="font-heading text-2xl font-semibold text-omnia-deep-blue"
        >
          Fale com a Omnia
        </h2>
        <p className="mt-1 text-sm text-omnia-graphite-light">
          Preencha o formulário. Usamos os dados apenas para contato comercial e atendimento da sua
          solicitação.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="nome" className="text-sm font-medium">
            Nome *
          </label>
          <Input
            id="nome"
            name="nome"
            autoComplete="name"
            required
            value={nome}
            onChange={(event) => {
              markFilling();
              setNome(event.target.value);
            }}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            E-mail *
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => {
              markFilling();
              setEmail(event.target.value);
            }}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="whatsapp" className="text-sm font-medium">
            WhatsApp *
          </label>
          <Input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            autoComplete="tel"
            required
            placeholder="(11) 90000-0000"
            value={whatsapp}
            onChange={(event) => {
              markFilling();
              setWhatsapp(event.target.value);
            }}
            disabled={pending}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="areaInteresse" className="text-sm font-medium">
            Área de interesse *
          </label>
          <select
            id="areaInteresse"
            name="areaInteresse"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={areaInteresse}
            onChange={(event) => {
              markFilling();
              setAreaInteresse(event.target.value);
            }}
            disabled={pending}
          >
            <option value="">Selecione</option>
            {LEAD_INTEREST_AREAS.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="empresa" className="text-sm font-medium">
            Empresa
          </label>
          <Input
            id="empresa"
            name="empresa"
            value={empresa}
            onChange={(event) => setEmpresa(event.target.value)}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="cargo" className="text-sm font-medium">
            Cargo
          </label>
          <Input
            id="cargo"
            name="cargo"
            value={cargo}
            onChange={(event) => setCargo(event.target.value)}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="cidade" className="text-sm font-medium">
            Cidade
          </label>
          <Input
            id="cidade"
            name="cidade"
            value={cidade}
            onChange={(event) => setCidade(event.target.value)}
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="estado" className="text-sm font-medium">
            Estado
          </label>
          <Input
            id="estado"
            name="estado"
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
            disabled={pending}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="organizationInteresse" className="text-sm font-medium">
            Empresa do grupo (opcional)
          </label>
          <select
            id="organizationInteresse"
            name="organizationInteresse"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={organizationInteresse}
            onChange={(event) => setOrganizationInteresse(event.target.value)}
            disabled={pending}
          >
            <option value="">Não sei / geral</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="mensagem" className="text-sm font-medium">
            Mensagem
          </label>
          <textarea
            id="mensagem"
            name="mensagem"
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={mensagem}
            onChange={(event) => setMensagem(event.target.value)}
            disabled={pending}
          />
        </div>
      </div>

      {/* Honeypot — oculto de usuários reais */}
      <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-input"
          checked={aceitePrivacidade}
          onChange={(event) => setAceitePrivacidade(event.target.checked)}
          disabled={pending}
          required
        />
        <span className="text-omnia-graphite-light">
          Autorizo o uso dos meus dados para contato comercial e atendimento desta solicitação,
          conforme a política de privacidade da Omnia Frigo. *
        </span>
      </label>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? 'Enviando…' : 'Quero ser contatado'}
      </Button>
    </form>
  );
}
