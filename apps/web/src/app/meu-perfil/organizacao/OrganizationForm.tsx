'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@omnia/ui';

import { INTEREST_AREA_OPTIONS } from '@/lib/auth/constants';
import type { PortalOrganization, PortalUser } from '@/lib/auth/types';

type OrganizationFormProps = {
  user: PortalUser;
  organizations: PortalOrganization[];
};

export function OrganizationForm({ user, organizations }: OrganizationFormProps) {
  const router = useRouter();
  const [employerName, setEmployerName] = useState(user.employerName ?? '');
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? '');
  const [segment, setSegment] = useState(user.segment ?? '');
  const [interestAreas, setInterestAreas] = useState<string[]>(user.interestAreas ?? []);
  const [groupOrganizations, setGroupOrganizations] = useState<string[]>(
    user.groupOrganizations ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggleInterestArea(value: string) {
    setInterestAreas((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function toggleOrganization(id: string) {
    setGroupOrganizations((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);

    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          employerName: employerName || undefined,
          jobTitle: jobTitle || undefined,
          segment: segment || undefined,
          interestAreas,
          groupOrganizations,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? 'Não foi possível salvar as preferências.');
        setPending(false);
        return;
      }

      setSuccess('Preferências salvas com sucesso.');
      router.refresh();
      setPending(false);
    } catch {
      setError('Falha temporária. Tente novamente.');
      setPending(false);
    }
  }

  return (
    <Card className="border-omnia-deep-blue/10">
      <CardHeader>
        <CardTitle>Organização e interesses</CardTitle>
        <CardDescription>
          Informe sua empresa e selecione áreas e organizações do ecossistema Omnia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="employerName" className="text-sm font-medium">
                Empresa
              </label>
              <Input
                id="employerName"
                value={employerName}
                onChange={(event) => setEmployerName(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="jobTitle" className="text-sm font-medium">
                Cargo
              </label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="segment" className="text-sm font-medium">
              Segmento
            </label>
            <Input
              id="segment"
              value={segment}
              onChange={(event) => setSegment(event.target.value)}
              disabled={pending}
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Áreas de interesse</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {INTEREST_AREA_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={interestAreas.includes(option.value)}
                    onChange={() => toggleInterestArea(option.value)}
                    disabled={pending}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {organizations.length > 0 ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Empresas do grupo</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {organizations.map((org) => (
                  <label key={org.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={groupOrganizations.includes(org.id)}
                      onChange={() => toggleOrganization(org.id)}
                      disabled={pending}
                    />
                    {org.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-omnia-emerald" role="status">
              {success}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando…' : 'Salvar preferências'}
            </Button>
            <Button asChild variant="ghost">
              <Link href="/minha-conta">Voltar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
