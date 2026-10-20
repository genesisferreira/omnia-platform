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
import { PASSWORD_POLICY_HINT, validatePasswordPolicy } from '@omnia/constants';

import { getAdminLoginUrl } from '@/lib/auth/admin-url';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError('Informe a senha atual.');
      return;
    }

    const policy = validatePasswordPolicy(password);
    if (!policy.ok) {
      setError(policy.error);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setPending(true);

    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error ?? 'Não foi possível alterar a senha.');
        setPending(false);
        return;
      }

      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setSuccess(payload?.message ?? 'Senha alterada. Faça login novamente.');
      setPending(false);
      window.setTimeout(() => {
        window.location.assign(getAdminLoginUrl('/minha-conta'));
      }, 1200);
    } catch {
      setError('Falha temporária. Tente novamente.');
      setPending(false);
    }
  }

  return (
    <Card className="border-omnia-deep-blue/10">
      <CardHeader>
        <CardTitle>Nova senha</CardTitle>
        <CardDescription>{PASSWORD_POLICY_HINT}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-sm font-medium">
              Senha atual
            </label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Nova senha
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmar senha
            </label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={pending}
            />
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
              {pending ? 'Salvando…' : 'Alterar senha'}
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
