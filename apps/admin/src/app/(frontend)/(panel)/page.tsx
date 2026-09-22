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

import { requireStaffSession } from '@/lib/auth';
import { getDashboardStats } from '@/lib/dashboard';

function formatCount(value: number | null): string {
  if (value == null) {
    return '—';
  }
  return String(value);
}

export default async function AdminDashboardPage() {
  const { user } = await requireStaffSession();
  const stats = await getDashboardStats();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const displayName = user.name?.trim() || user.email || 'usuário';

  const cards = [
    { label: 'Empresas', value: stats.companies, href: '/admin/collections/companies' },
    { label: 'Tenants', value: stats.tenants, href: '/admin/collections/tenants' },
    { label: 'Mídia', value: stats.media, href: '/admin/collections/media' },
    { label: 'Usuários', value: stats.users, href: '/admin/collections/users' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {greeting}, {displayName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Painel autorizado · papel{' '}
          <span className="font-medium text-foreground">{user.role ?? 'desconhecido'}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{formatCount(item.value)}</CardTitle>
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
            <CardDescription>Indicadores disponíveis para a sessão autenticada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">CMS (Payload)</span>
              {stats.online == null ? (
                <Badge variant="muted">Indisponível</Badge>
              ) : (
                <Badge variant={stats.online ? 'default' : 'muted'}>
                  {stats.online ? 'Online' : 'Indisponível'}
                </Badge>
              )}
            </div>
            {stats.error ? (
              <p className="text-sm text-muted-foreground" role="status">
                {stats.error}
              </p>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-sm">Ambiente</span>
              <Badge variant="outline">
                {process.env.NODE_ENV === 'production' ? 'production' : 'non-production'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
            <CardDescription>Somente ações autorizadas ao seu papel</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="default">
              <Link href="/admin">Abrir Payload CMS</Link>
            </Button>
            {(user.role === 'super_admin' || user.role === 'admin' || user.role === 'editor') && (
              <Button asChild variant="outline">
                <Link href="/admin/collections/media">Mídia</Link>
              </Button>
            )}
            {(user.role === 'super_admin' || user.role === 'admin') && (
              <Button asChild variant="outline">
                <Link href="/admin/collections/users">Usuários</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <a href={process.env.NEXT_PUBLIC_APP_URL || 'https://omniafrigo.com.br'}>
                Ver portal
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
