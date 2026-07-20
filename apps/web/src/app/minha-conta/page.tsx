import Link from 'next/link';

import {
  ACCOUNT_STATUS_LABELS,
  PLATFORM_ROLE_LABELS,
  type AccountStatus,
  type PlatformRole,
} from '@omnia/constants';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
} from '@omnia/ui';

import { requirePortalSession } from '@/lib/auth/require-session';

export const metadata = {
  title: 'Minha conta',
  description: 'Resumo da sua conta no ecossistema Omnia.',
};

export default async function MinhaContaPage() {
  const user = await requirePortalSession('/minha-conta');

  const roleLabel =
    user.role && user.role in PLATFORM_ROLE_LABELS
      ? PLATFORM_ROLE_LABELS[user.role as PlatformRole]
      : 'Usuário';

  const statusLabel =
    user.accountStatus && user.accountStatus in ACCOUNT_STATUS_LABELS
      ? ACCOUNT_STATUS_LABELS[user.accountStatus as AccountStatus]
      : (user.accountStatus ?? '—');

  return (
    <Container className="py-12 md:py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-omnia-copper">
            Área do usuário
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-omnia-deep-blue md:text-4xl">
            Minha conta
          </h1>
          <p className="text-omnia-graphite-light">
            Olá, {user.name ?? user.firstName ?? user.email}. Gerencie seu perfil e preferências.
          </p>
        </header>

        <Card className="border-omnia-deep-blue/10">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>
              Informações principais da sua identidade na plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-omnia-graphite-light">
                E-mail
              </p>
              <p className="text-sm text-omnia-deep-blue">{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-omnia-graphite-light">
                Papel
              </p>
              <p className="text-sm text-omnia-deep-blue">{roleLabel}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-omnia-graphite-light">
                Status
              </p>
              <p className="text-sm text-omnia-deep-blue">{statusLabel}</p>
            </div>
            {user.phone ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-omnia-graphite-light">
                  Telefone
                </p>
                <p className="text-sm text-omnia-deep-blue">{user.phone}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-omnia-deep-blue/10">
            <CardHeader>
              <CardTitle className="text-lg">Meu perfil</CardTitle>
              <CardDescription>Nome, contato e dados pessoais.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/meu-perfil">Editar perfil</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-omnia-deep-blue/10">
            <CardHeader>
              <CardTitle className="text-lg">Segurança</CardTitle>
              <CardDescription>Altere sua senha de acesso.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/meu-perfil/senha">Trocar senha</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-omnia-deep-blue/10 sm:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Organização</CardTitle>
              <CardDescription>Empresa, segmento e empresas do grupo de interesse.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/meu-perfil/organizacao">Preferências de organização</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <form action="/api/auth/logout" method="post">
          <Button type="submit" variant="ghost" className="text-omnia-graphite-light">
            Sair da conta
          </Button>
        </form>
      </div>
    </Container>
  );
}
