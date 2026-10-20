'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { getConfiguredPublicOrigin, resolveEstablishDestination } from '@omnia/shared';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@omnia/ui';

import { ADMIN_PANEL_ROLES, isPortalDestination, PORTAL_ROLES } from '@/lib/portal-redirect';
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

function portalBaseUrl(): string | null {
  const resolved = getConfiguredPublicOrigin({
    configuredUrl: process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: process.env.NODE_ENV,
    fallbackDev: 'http://localhost:3000',
  });
  return resolved.ok ? resolved.origin : null;
}

/** Top-level form POST so Portal can Set-Cookie on its own domain. */
function establishPortalSession(token: string, nextPath: string, portalOrigin: string) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${portalOrigin}/api/auth/establish`;
  form.style.display = 'none';

  const tokenInput = document.createElement('input');
  tokenInput.name = 'token';
  tokenInput.value = token;
  form.appendChild(tokenInput);

  const nextInput = document.createElement('input');
  nextInput.name = 'next';
  nextInput.value = nextPath;
  form.appendChild(nextInput);

  document.body.appendChild(form);
  form.submit();
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
        token?: string;
        user?: { role?: string; accountStatus?: string };
        errors?: Array<{ message?: string }>;
        message?: string;
      } | null;

      if (!response.ok) {
        const technical = payload?.errors?.[0]?.message || payload?.message;
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

      const role = String(payload?.user?.role || '');
      const token = typeof payload?.token === 'string' ? payload.token : '';
      const rawNext = searchParams.get('next');
      const portalNext = resolveEstablishDestination(role, rawNext);

      // Portal roles always land on the Web Portal (never Admin /area placeholders).
      if (PORTAL_ROLES.has(role)) {
        if (!token) {
          setError('Sessão inválida. Tente novamente.');
          setPending(false);
          return;
        }
        const portal = portalBaseUrl();
        if (!portal) {
          setError('Origem pública do portal indisponível. Contate o suporte.');
          setPending(false);
          return;
        }
        establishPortalSession(token, portalNext, portal);
        return;
      }

      if (ADMIN_PANEL_ROLES.has(role)) {
        // Staff who started login from Portal (`next=/ia`, cursos, etc.) → Portal.
        if (rawNext && isPortalDestination(rawNext)) {
          if (!token) {
            setError('Sessão inválida. Tente novamente.');
            setPending(false);
            return;
          }
          const portal = portalBaseUrl();
          if (!portal) {
            setError('Origem pública do portal indisponível. Contate o suporte.');
            setPending(false);
            return;
          }
          establishPortalSession(token, portalNext, portal);
          return;
        }
        router.replace(safeRedirectPath(rawNext));
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
