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

import type { PortalUser } from '@/lib/auth/types';

type ProfileFormProps = {
  user: PortalUser;
};

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(user.whatsapp ?? '');
  const [cpf, setCpf] = useState(user.cpf ?? '');
  const [country, setCountry] = useState(user.country ?? 'Brasil');
  const [state, setState] = useState(user.state ?? '');
  const [city, setCity] = useState(user.city ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
          firstName,
          lastName,
          phone: phone || undefined,
          whatsapp: whatsapp || undefined,
          cpf: cpf || undefined,
          country: country || undefined,
          state: state || undefined,
          city: city || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? 'Não foi possível salvar o perfil.');
        setPending(false);
        return;
      }

      setSuccess('Perfil atualizado com sucesso.');
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
        <CardTitle>Dados pessoais</CardTitle>
        <CardDescription>Atualize suas informações de contato e localização.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">
                Nome
              </label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Sobrenome
              </label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={pending}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>
            <Input id="email" value={user.email} disabled readOnly />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Telefone
              </label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="whatsapp" className="text-sm font-medium">
                WhatsApp
              </label>
              <Input
                id="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="cpf" className="text-sm font-medium">
              CPF
            </label>
            <Input
              id="cpf"
              value={cpf}
              onChange={(event) => setCpf(event.target.value)}
              disabled={pending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="country" className="text-sm font-medium">
                País
              </label>
              <Input
                id="country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="state" className="text-sm font-medium">
                Estado
              </label>
              <Input
                id="state"
                value={state}
                onChange={(event) => setState(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="city" className="text-sm font-medium">
                Cidade
              </label>
              <Input
                id="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

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
              {pending ? 'Salvando…' : 'Salvar alterações'}
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
