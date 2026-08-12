'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { PASSWORD_POLICY_HINT, validatePasswordPolicy } from '@omnia/constants';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@omnia/ui';

function mapResetError(status: number, message?: string): string {
  const normalized = (message || '').toLowerCase();
  if (
    status === 400 ||
    status === 403 ||
    normalized.includes('token') ||
    normalized.includes('expired') ||
    normalized.includes('expir') ||
    normalized.includes('invalid')
  ) {
    if (normalized.includes('expir')) {
      return 'Este link expirou. Solicite uma nova recuperação de senha.';
    }
    if (normalized.includes('token') || normalized.includes('invalid')) {
      return 'Link inválido ou expirado. Solicite uma nova recuperação de senha.';
    }
  }
  if (status === 400 && message?.trim()) {
    return message.trim();
  }
  if (status === 429) {
    return 'Muitas tentativas. Aguarde um minuto e tente novamente.';
  }
  if (status >= 500) {
    return 'Falha temporária. Tente novamente.';
  }
  return 'Não foi possível redefinir a senha. Tente novamente.';
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('Link inválido. Solicite uma nova recuperação de senha.');
      return;
    }

    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    const policy = validatePasswordPolicy(password);
    if (!policy.ok) {
      setError(policy.error);
      return;
    }

    setPending(true);

    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });

      const payload = (await response.json().catch(() => null)) as {
        errors?: Array<{ message?: string }>;
        message?: string;
      } | null;

      if (!response.ok) {
        const technical = payload?.errors?.[0]?.message || payload?.message;
        setError(mapResetError(response.status, technical));
        setPending(false);
        return;
      }

      setDone(true);
      setPending(false);
      window.setTimeout(() => {
        router.replace('/login');
        router.refresh();
      }, 1500);
    } catch {
      setError('Falha temporária. Tente novamente.');
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-omnia-deep-blue/10 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Redefinir senha</CardTitle>
        <CardDescription>{PASSWORD_POLICY_HINT}</CardDescription>
      </CardHeader>
      <CardContent>
        {!token ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive" role="alert">
              Link inválido. Solicite uma nova recuperação de senha.
            </p>
            <Link
              href="/esqueci-senha"
              className="inline-flex text-sm font-medium text-omnia-deep-blue underline-offset-4 hover:underline"
            >
              Solicitar recuperação
            </Link>
          </div>
        ) : done ? (
          <p className="text-sm text-foreground" role="status">
            Senha atualizada. Redirecionando para o login…
          </p>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Nova senha
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium">
                Confirmar senha
              </label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                disabled={pending}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
            <Link
              href="/login"
              className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Voltar ao login
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
