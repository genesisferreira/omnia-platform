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

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
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
        body: JSON.stringify({ password }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(payload?.error ?? 'Não foi possível alterar a senha.');
        setPending(false);
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setSuccess('Senha alterada com sucesso.');
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
        <CardTitle>Nova senha</CardTitle>
        <CardDescription>Escolha uma senha forte com pelo menos 8 caracteres.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Nova senha
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
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
              minLength={8}
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
