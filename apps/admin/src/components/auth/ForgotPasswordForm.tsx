'use client';

import Link from 'next/link';
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

import { FORGOT_PASSWORD_NEUTRAL_MESSAGE } from '@/email/auth-messages';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      // Sempre mensagem neutra em 2xx/4xx de negócio para não enumerar contas.
      if (response.ok || response.status === 400 || response.status === 404) {
        setDone(true);
        setPending(false);
        return;
      }

      if (response.status === 429) {
        setError('Muitas tentativas. Aguarde um minuto e tente novamente.');
        setPending(false);
        return;
      }

      setError('Não foi possível enviar a solicitação. Tente novamente.');
      setPending(false);
    } catch {
      setError('Falha temporária. Tente novamente.');
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-omnia-deep-blue/10 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Esqueci minha senha</CardTitle>
        <CardDescription>
          Informe o e-mail da conta. Se existir cadastro, enviaremos as instruções.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground" role="status">
              {FORGOT_PASSWORD_NEUTRAL_MESSAGE}
            </p>
            <Link
              href="/login"
              className="inline-flex text-sm font-medium text-omnia-deep-blue underline-offset-4 hover:underline"
            >
              Voltar ao login
            </Link>
          </div>
        ) : (
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
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Enviando…' : 'Enviar instruções'}
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
