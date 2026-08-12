'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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

import { safeRedirectPath } from '@/lib/safe-redirect';

function mapLoginError(status: number, payloadMessage?: string): string {
  if (status === 429) {
    return 'Muitas tentativas. Aguarde um minuto e tente novamente.';
  }
  if (status >= 500) {
    return 'Falha temporária de autenticação. Tente novamente.';
  }
  if (status === 403) {
    return payloadMessage?.trim() || 'Acesso não autorizado para esta conta.';
  }
  return 'Não foi possível autenticar. Verifique suas credenciais.';
}

function portalBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://omniafrigo.com.br').replace(/\/$/, '');
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json().catch(() => null)) as {
        user?: { role?: string; accountStatus?: string };
        errors?: Array<{ message?: string }>;
        message?: string;
      } | null;

      if (!response.ok) {
        const technical = payload?.errors?.[0]?.message || payload?.message;
        // Mensagem neutra ao usuário; status técnico permanece no Network/logs.
        setError(mapLoginError(response.status, technical));
        setPending(false);
        return;
      }

      const accountStatus = payload?.user?.accountStatus;
      if (accountStatus === 'blocked') {
        await fetch('/api/users/logout', { method: 'POST', credentials: 'include' }).catch(
          () => undefined,
        );
        setError('Esta conta está bloqueada. Entre em contato com o suporte.');
        setPending(false);
        return;
      }

      const role = payload?.user?.role;
      if (role === 'client') {
        window.location.assign(`${portalBaseUrl()}/minha-conta`);
        return;
      }

      if (role === 'partner' || role === 'instructor' || role === 'student') {
        router.replace(`/area/${role}`);
        router.refresh();
        return;
      }

      if (role === 'super_admin' || role === 'admin' || role === 'editor') {
        router.replace(safeRedirectPath(searchParams.get('next')));
        router.refresh();
        return;
      }

      router.replace('/unauthorized');
      router.refresh();
    } catch {
      setError('Falha temporária de autenticação. Tente novamente.');
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-omnia-deep-blue/10 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Entrar na plataforma</CardTitle>
        <CardDescription>
          Use suas credenciais Omnia para acessar a área autorizada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Entrando…' : 'Entrar'}
          </Button>
          <Link
            href="/esqueci-senha"
            className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
