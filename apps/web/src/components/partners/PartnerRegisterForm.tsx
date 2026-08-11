'use client';

import { useState, type FormEvent } from 'react';

import { Button, Input } from '@omnia/ui';

import { getPublicAdminUrl } from '@/lib/auth/admin-url';

type Taxonomy = { id: string; name: string; slug: string };

type PartnerRegisterFormProps = {
  categories: Taxonomy[];
  specialties: Taxonomy[];
};

type FormState = 'idle' | 'submitting' | 'success' | 'error';
type CepState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

export function PartnerRegisterForm({ categories, specialties }: PartnerRegisterFormProps) {
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [specialtyIds, setSpecialtyIds] = useState<string[]>([]);
  const [cepState, setCepState] = useState<CepState>('idle');
  const [cepMessage, setCepMessage] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [country, setCountry] = useState('Brasil');

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  async function lookupCep(raw: string) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepState('error');
      setCepMessage('Informe um CEP com 8 dígitos.');
      return;
    }
    setCepState('loading');
    setCepMessage('Buscando CEP…');
    try {
      const res = await fetch(
        `${getPublicAdminUrl()}/api/omnia/postal-code?cep=${encodeURIComponent(digits)}`,
      );
      const data = (await res.json()) as {
        ok?: boolean;
        address?: {
          address?: string | null;
          neighborhood?: string | null;
          city?: string;
          state?: string;
          country?: string;
          zipCode?: string;
        };
        error?: { message?: string };
      };
      if (!res.ok || !data.ok || !data.address) {
        setCepState(res.status === 404 ? 'not_found' : 'error');
        setCepMessage(data.error?.message || 'CEP não encontrado.');
        return;
      }
      setZipCode(data.address.zipCode || digits);
      if (data.address.address) setAddress(data.address.address);
      if (data.address.neighborhood) setNeighborhood(data.address.neighborhood);
      if (data.address.city) setCity(data.address.city);
      if (data.address.state) setUf(data.address.state);
      if (data.address.country) setCountry(data.address.country);
      setCepState('found');
      setCepMessage('CEP encontrado. Confira o endereço e informe o número.');
    } catch {
      setCepState('error');
      setCepMessage('Erro temporário ao consultar o CEP. Tente novamente.');
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'submitting') {
      return;
    }
    setError(null);
    setState('submitting');

    const formEl = event.currentTarget;
    const fd = new FormData(formEl);
    const payload = {
      companyName: String(fd.get('companyName') || ''),
      tradeName: String(fd.get('tradeName') || ''),
      partnerType: String(fd.get('partnerType') || 'company'),
      document: String(fd.get('document') || ''),
      description: String(fd.get('description') || ''),
      servicesDescription: String(fd.get('servicesDescription') || ''),
      email: String(fd.get('email') || ''),
      phone: String(fd.get('phone') || ''),
      whatsapp: String(fd.get('whatsapp') || ''),
      website: String(fd.get('website') || ''),
      instagram: String(fd.get('instagram') || ''),
      linkedin: String(fd.get('linkedin') || ''),
      zipCode,
      address,
      addressNumber: String(fd.get('addressNumber') || ''),
      addressComplement: String(fd.get('addressComplement') || ''),
      neighborhood,
      city,
      state: uf,
      country,
      coverageRadius: fd.get('coverageRadius') ? Number(fd.get('coverageRadius')) : undefined,
      categoryIds: categoryIds.map(Number),
      specialtyIds: specialtyIds.map(Number),
      brandsServed: String(fd.get('brandsServed') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      privacyAccepted: fd.get('privacyAccepted') === 'on',
      analysisAuthorized: fd.get('analysisAuthorized') === 'on',
      truthfulnessConfirmed: fd.get('truthfulnessConfirmed') === 'on',
      companyWebsite: String(fd.get('companyWebsite') || ''),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45_000);

    try {
      const res = await fetch(`${getPublicAdminUrl()}/api/omnia/partner-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      let data: {
        success?: boolean;
        ok?: boolean;
        code?: string;
        message?: string;
        retryAfter?: number;
        error?: { code?: string; message?: string };
      } = {};
      const raw = await res.text();
      if (raw) {
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          setState('error');
          setError(
            'Não foi possível concluir agora. Seus dados foram preservados. Tente novamente.',
          );
          return;
        }
      }

      const apiMessage = data.message || data.error?.message;
      const code = data.code || data.error?.code;
      const success = data.success === true || data.ok === true;

      if (res.status === 429 || code === 'RATE_LIMITED') {
        const retryAfter = data.retryAfter;
        const minutes =
          retryAfter && retryAfter > 0 ? Math.max(1, Math.ceil(retryAfter / 60)) : null;
        setState('error');
        setError(
          apiMessage ||
            (minutes
              ? `Muitas tentativas. Tente novamente em ${minutes} minuto${minutes === 1 ? '' : 's'}.`
              : 'Muitas tentativas. Tente novamente em alguns minutos.'),
        );
        return;
      }

      if (res.status >= 500 || code === 'INTERNAL_ERROR' || code === 'SERVICE_UNAVAILABLE') {
        setState('error');
        setError(
          apiMessage ||
            'Não foi possível concluir agora. Seus dados foram preservados. Tente novamente.',
        );
        return;
      }

      if (!res.ok || !success) {
        setState('error');
        setError(apiMessage || 'Não foi possível enviar o cadastro.');
        return;
      }

      setSuccessMessage(apiMessage || 'Cadastro enviado com sucesso. Nossa equipe fará a análise.');
      setState('success');
      formEl.reset();
      setCategoryIds([]);
      setSpecialtyIds([]);
      setZipCode('');
      setAddress('');
      setNeighborhood('');
      setCity('');
      setUf('');
      setCountry('Brasil');
      setCepState('idle');
      setCepMessage(null);
    } catch (err) {
      setState('error');
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      setError(
        aborted
          ? 'A solicitação demorou demais. Seus dados foram preservados. Verifique se o cadastro já aparece ou tente novamente.'
          : 'Não foi possível concluir agora. Seus dados foram preservados. Tente novamente.',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (state === 'success') {
    return (
      <div
        role="status"
        className="border border-omnia-emerald/30 bg-omnia-emerald/5 p-6 text-omnia-deep-blue"
      >
        <h2 className="font-heading text-xl font-semibold">Cadastro recebido</h2>
        <p className="mt-2 text-sm leading-relaxed">{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10" noValidate>
      <fieldset className="space-y-4">
        <legend className="font-heading text-lg font-semibold text-omnia-deep-blue">
          Identificação
        </legend>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium">
              Razão social / nome profissional <span aria-hidden="true">*</span>
            </span>
            <Input name="companyName" required autoComplete="organization" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Nome fantasia</span>
            <Input name="tradeName" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Tipo *</span>
            <select
              name="partnerType"
              className="w-full rounded-md border border-omnia-deep-blue/20 bg-white px-3 py-2 text-sm"
              defaultValue="company"
              required
            >
              <option value="company">Empresa</option>
              <option value="professional">Profissional</option>
            </select>
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium">CPF ou CNPJ *</span>
            <Input name="document" required inputMode="numeric" />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Descrição</span>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded-md border border-omnia-deep-blue/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Serviços</span>
            <textarea
              name="servicesDescription"
              rows={3}
              className="w-full rounded-md border border-omnia-deep-blue/20 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-heading text-lg font-semibold text-omnia-deep-blue">Contato</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium">E-mail *</span>
            <Input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Telefone</span>
            <Input name="phone" autoComplete="tel" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">WhatsApp</span>
            <Input name="whatsapp" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Site</span>
            <Input name="website" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Instagram</span>
            <Input name="instagram" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">LinkedIn</span>
            <Input name="linkedin" />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-heading text-lg font-semibold text-omnia-deep-blue">
          Localização
        </legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm">
              <span className="mb-1 block font-medium">CEP *</span>
              <Input
                name="zipCode"
                inputMode="numeric"
                value={zipCode}
                onChange={(e) => {
                  const v = e.target.value;
                  setZipCode(v);
                  const digits = v.replace(/\D/g, '');
                  if (digits.length === 8) {
                    void lookupCep(digits);
                  }
                }}
                placeholder="30110-012"
                required
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={cepState === 'loading'}
              onClick={() => void lookupCep(zipCode)}
            >
              {cepState === 'loading' ? 'Buscando…' : 'Buscar CEP'}
            </Button>
          </div>
          {cepMessage ? (
            <p
              className={`md:col-span-2 text-sm ${
                cepState === 'found' ? 'text-omnia-emerald' : 'text-omnia-graphite-light'
              }`}
              role="status"
            >
              {cepMessage}
            </p>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Raio de atendimento (km)</span>
            <Input name="coverageRadius" type="number" min={0} />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Endereço</span>
            <Input name="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Número</span>
            <Input name="addressNumber" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Complemento</span>
            <Input name="addressComplement" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Bairro</span>
            <Input
              name="neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Cidade *</span>
            <Input name="city" required value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">UF *</span>
            <Input
              name="state"
              required
              maxLength={2}
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">País</span>
            <Input name="country" value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-heading text-lg font-semibold text-omnia-deep-blue">Atuação</legend>
        <div>
          <p className="mb-2 text-sm font-medium">Categorias</p>
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(c.id)}
                  onChange={() => setCategoryIds((list) => toggleId(list, c.id))}
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Especialidades</p>
          <div className="flex max-h-48 flex-wrap gap-3 overflow-y-auto">
            {specialties.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={specialtyIds.includes(s.id)}
                  onChange={() => setSpecialtyIds((list) => toggleId(list, s.id))}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Marcas atendidas (separadas por vírgula)</span>
          <Input name="brandsServed" />
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-heading text-lg font-semibold text-omnia-deep-blue">
          Consentimentos
        </legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="privacyAccepted" required className="mt-1" />
          <span>Aceito a política de privacidade *</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="analysisAuthorized" required className="mt-1" />
          <span>Autorizo a análise do cadastro pela equipe Omnia *</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="truthfulnessConfirmed" required className="mt-1" />
          <span>Declaro que as informações são verdadeiras *</span>
        </label>
        <label className="sr-only" aria-hidden="true">
          Website
          <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
        </label>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Enviando cadastro...' : 'Enviar cadastro'}
      </Button>
    </form>
  );
}
