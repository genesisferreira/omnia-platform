'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button, Input } from '@omnia/ui';

type Taxonomy = { id: string; name: string; slug: string };

type PartnerSearchFormProps = {
  categories: Taxonomy[];
  specialties: Taxonomy[];
};

export function PartnerSearchForm({ categories, specialties }: PartnerSearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  const initial = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      postalCode: searchParams.get('postalCode') || searchParams.get('zipCode') || '',
      nearCity: searchParams.get('nearCity') || '',
      nearState: searchParams.get('nearState') || '',
      category: searchParams.get('category') || '',
      specialty: searchParams.get('specialty') || '',
      partnerType: searchParams.get('partnerType') || '',
      radiusKm: searchParams.get('radiusKm') || '50',
    }),
    [searchParams],
  );

  const [form, setForm] = useState(initial);

  const applyParams = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      Object.entries(next).forEach(([key, value]) => {
        if (value && value.trim()) {
          params.set(key, value.trim());
        }
      });
      startTransition(() => {
        router.push(`/parceiros?${params.toString()}`);
      });
    },
    [router],
  );

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setGeoError(null);
    setGeoStatus(null);

    const hasCep = form.postalCode.replace(/\D/g, '').length === 8;
    const hasCity = Boolean(form.nearCity.trim() && form.nearState.trim());

    if (hasCep) {
      setGeoStatus('Buscando por CEP…');
    } else if (hasCity) {
      setGeoStatus('Localizando por cidade…');
    } else if (!searchParams.get('lat')) {
      setGeoStatus(
        'Sem localização: resultados por destaque e nome. Informe CEP, cidade ou use GPS.',
      );
    }

    applyParams({
      q: form.q,
      postalCode: hasCep ? form.postalCode.replace(/\D/g, '') : undefined,
      nearCity: !hasCep && hasCity ? form.nearCity : undefined,
      nearState: !hasCep && hasCity ? form.nearState : undefined,
      category: form.category,
      specialty: form.specialty,
      partnerType: form.partnerType,
      radiusKm: form.radiusKm,
      // Limpa GPS se usuário buscou por CEP/cidade
      lat: hasCep || hasCity ? undefined : searchParams.get('lat') || undefined,
      lng: hasCep || hasCity ? undefined : searchParams.get('lng') || undefined,
    });
  };

  const useLocation = () => {
    setGeoError(null);
    setGeoStatus(null);
    if (!navigator.geolocation) {
      setGeoError('Seu navegador não suporta geolocalização. Use CEP ou cidade/UF.');
      return;
    }
    setGeoLoading(true);
    setGeoStatus('Obtendo localização…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        setGeoStatus('Localização permitida');
        applyParams({
          q: form.q,
          category: form.category,
          specialty: form.specialty,
          partnerType: form.partnerType,
          radiusKm: form.radiusKm || '50',
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        });
      },
      () => {
        setGeoLoading(false);
        setGeoStatus('Localização negada');
        setGeoError(
          'Não foi possível obter sua localização. Busque por CEP ou cidade/UF.',
        );
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 border border-omnia-deep-blue/10 bg-omnia-white p-5 md:p-6"
    >
      <div>
        <h2 className="font-heading text-lg font-semibold text-omnia-deep-blue">
          Encontre parceiros próximos
        </h2>
        <p className="mt-1 text-sm text-omnia-graphite-light">
          Use GPS, CEP ou cidade. Sem localização, listamos por destaque — sem assumir São Paulo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block font-medium text-omnia-deep-blue">Busca por nome</span>
          <Input
            name="q"
            value={form.q}
            onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))}
            placeholder="Nome fantasia ou razão social"
            aria-label="Busca por nome"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">CEP (sua localização)</span>
          <Input
            name="postalCode"
            inputMode="numeric"
            value={form.postalCode}
            onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
            placeholder="30110-012"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">Raio (km)</span>
          <Input
            name="radiusKm"
            type="number"
            min={1}
            max={500}
            value={form.radiusKm}
            onChange={(e) => setForm((f) => ({ ...f, radiusKm: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">Cidade (sua localização)</span>
          <Input
            name="nearCity"
            value={form.nearCity}
            onChange={(e) => setForm((f) => ({ ...f, nearCity: e.target.value }))}
            placeholder="Belo Horizonte"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">UF</span>
          <Input
            name="nearState"
            maxLength={2}
            value={form.nearState}
            onChange={(e) => setForm((f) => ({ ...f, nearState: e.target.value.toUpperCase() }))}
            placeholder="MG"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">Categoria</span>
          <select
            className="w-full rounded-md border border-omnia-deep-blue/20 bg-white px-3 py-2 text-sm"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">Especialidade</span>
          <select
            className="w-full rounded-md border border-omnia-deep-blue/20 bg-white px-3 py-2 text-sm"
            value={form.specialty}
            onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
          >
            <option value="">Todas</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">Tipo</span>
          <select
            className="w-full rounded-md border border-omnia-deep-blue/20 bg-white px-3 py-2 text-sm"
            value={form.partnerType}
            onChange={(e) => setForm((f) => ({ ...f, partnerType: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="company">Empresa</option>
            <option value="professional">Profissional</option>
          </select>
        </label>
      </div>

      {geoStatus ? <p className="text-sm text-omnia-graphite-light">{geoStatus}</p> : null}
      {geoError ? (
        <p role="alert" className="text-sm text-red-700">
          {geoError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Buscando…' : 'Buscar parceiros'}
        </Button>
        <Button type="button" variant="outline" onClick={useLocation} disabled={geoLoading || pending}>
          {geoLoading ? 'Obtendo localização…' : 'Usar minha localização'}
        </Button>
      </div>
    </form>
  );
}
