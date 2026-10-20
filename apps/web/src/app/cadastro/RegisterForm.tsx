'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
} from '@omnia/ui';
import { PASSWORD_POLICY_HINT, validatePasswordPolicy } from '@omnia/constants';

import { getAdminLoginUrl } from '@/lib/auth/admin-url';

export function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const policy = validatePasswordPolicy(password);
    if (!policy.ok) {
      setError(policy.error);
      return;
    }

    setPending(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          password,
          lgpdAccepted,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error ?? 'Não foi possível concluir o cadastro.');
        setPending(false);
        return;
      }

      router.replace('/minha-conta');
      router.refresh();
    } catch {
      setError('Falha temporária. Tente novamente em instantes.');
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-lg border-omnia-deep-blue/10 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Criar conta</CardTitle>
        <CardDescription>
          Cadastre-se no ecossistema Omnia para acessar conteúdos e serviços personalizados.
        </CardDescription>
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
                name="firstName"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Sobrenome
              </label>
              <Input
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Telefone
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Senha
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
            />
            <p className="text-xs text-omnia-graphite-light">{PASSWORD_POLICY_HINT}</p>
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-input"
              checked={lgpdAccepted}
              onChange={(event) => setLgpdAccepted(event.target.checked)}
              disabled={pending}
              required
            />
            <span className="text-omnia-graphite-light">
              Li e aceito o tratamento dos meus dados conforme a política de privacidade (LGPD).
            </span>
          </label>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Cadastrando…' : 'Criar conta'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-1 text-sm text-omnia-graphite-light">
        <span>Já possui conta?</span>
        <Link
          href={getAdminLoginUrl('/minha-conta')}
          className="font-medium text-omnia-deep-blue hover:underline"
        >
          Entrar na plataforma
        </Link>
      </CardFooter>
    </Card>
  );
}
