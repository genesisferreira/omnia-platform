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

  const initial = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      city: searchParams.get('city') || '',
      state: searchParams.get('state') || '',
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
    applyParams({
      q: form.q,
      city: form.city,
      state: form.state,
      category: form.category,
      specialty: form.specialty,
      partnerType: form.partnerType,
      radiusKm: form.radiusKm,
      lat: searchParams.get('lat') || undefined,
      lng: searchParams.get('lng') || undefined,
    });
  };

  const useLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Seu navegador não suporta geolocalização. Use cidade, UF ou CEP.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        applyParams({
          q: form.q,
          city: form.city,
          state: form.state,
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
        setGeoError(
          'Não foi possível obter sua localização. Você pode buscar por cidade, UF ou CEP.',
        );
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 border border-omnia-deep-blue/10 bg-omnia-white p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">Busca</span>
          <Input
            name="q"
            value={form.q}
            onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))}
            placeholder="Nome, cidade, CEP…"
            aria-label="Busca por nome, cidade ou CEP"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">Cidade</span>
          <Input
            name="city"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">UF</span>
          <Input
            name="state"
            maxLength={2}
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
            placeholder="SP"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">Raio (km)</span>
          <Input
            name="radiusKm"
            type="number"
            min={1}
            value={form.radiusKm}
            onChange={(e) => setForm((f) => ({ ...f, radiusKm: e.target.value }))}
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

      <p className="text-xs text-omnia-graphite-light">
        Usamos sua localização apenas para ordenar parceiros próximos. Nada é armazenado no servidor
        sem necessidade.
      </p>

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
