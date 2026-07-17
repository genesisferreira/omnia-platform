'use client';

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

function isSafeNext(path: string | null): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return '/';
  }
  if (path.startsWith('/login') || path.startsWith('/api/')) {
    return '/';
  }
  return path;
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
        user?: { role?: string };
        errors?: Array<{ message?: string }>;
        message?: string;
      } | null;

      if (!response.ok) {
        setError('Não foi possível autenticar. Verifique suas credenciais.');
        setPending(false);
        return;
      }

      const role = payload?.user?.role;
      if (role === 'partner' || role === 'instructor' || role === 'student') {
        router.replace(`/area/${role}`);
        router.refresh();
        return;
      }

      if (role === 'super_admin' || role === 'admin' || role === 'editor') {
        router.replace(isSafeNext(searchParams.get('next')));
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
        </form>
      </CardContent>
    </Card>
  );
}
