import Link from 'next/link';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@omnia/ui';

import { getDashboardStats } from '@/lib/dashboard';

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {greeting}, bem-vindo ao Omnia Admin
        </h1>
        <p className="mt-2 text-muted-foreground">Dashboard inicial — Sprint 2 Platform Base</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Empresas', value: stats.companies, href: '/admin/collections/companies' },
          { label: 'Tenants', value: stats.tenants, href: '/admin/collections/tenants' },
          { label: 'Mídia', value: stats.media, href: '/admin/collections/media' },
          { label: 'Usuários', value: stats.users, href: '/admin/collections/users' },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={item.href} className="text-sm text-primary hover:underline">
                Gerenciar →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status da plataforma</CardTitle>
            <CardDescription>Visão rápida do ambiente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">CMS (Payload)</span>
              <Badge variant={stats.online ? 'default' : 'muted'}>
                {stats.online ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Ambiente</span>
              <Badge variant="outline">{process.env.NODE_ENV ?? 'development'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Versão</span>
              <span className="text-sm text-muted-foreground">
                {process.env.APP_VERSION ?? '0.3.0'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atalhos rápidos</CardTitle>
            <CardDescription>Acesso direto às áreas principais</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="default">
              <Link href="/admin">Abrir Payload Admin</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/collections/companies/create">Nova empresa</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/globals/global-settings">Configurações globais</Link>
            </Button>
            <Button asChild variant="outline">
              <a href={process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}>Ver portal</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Próximos passos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>
              Execute <code className="rounded bg-muted px-1">pnpm --filter @omnia/admin seed</code>{' '}
              para cadastrar as empresas da Holding
            </li>
            <li>
              Crie um usuário admin em{' '}
              <Link href="/admin" className="text-primary hover:underline">
                Payload CMS
              </Link>
            </li>
            <li>Faça upload de logos na Media Library</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
